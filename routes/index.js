var express = require('express');
var router = express.Router();
var redisClient = require("../repository/redis");

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60; // In seconds

// Middleware for rate limiting using Redis hashes
const rateLimiter = async (req, res) => {
  const ip = req.ip;
  const key = `rate_limit:${ip}`; // Use a prefix to avoid key collisions

  try {
    // Get the current count and timestamp for the IP
    const count = await redisClient.hGet(key, 'count');
    const startTime = await redisClient.hGet(key, 'startTime');

    let requestData;

    if (!count || !startTime) {
      // First request from this IP in this window
      requestData = { count: 1, startTime: Date.now() };
      await redisClient.hSet(key, 'count', requestData.count);
      await redisClient.hSet(key, 'startTime', requestData.startTime);
      await redisClient.expire(key, RATE_LIMIT_WINDOW); // Set expiration for the key

      return res.json({
        status: 200,
        message: "Added IP to cache"
      });
    } else {
      // Parse existing data
      requestData = { count: parseInt(count), startTime: parseInt(startTime) };

      // Calculate the time difference in seconds
      const timeDifference = Math.floor((Date.now() - requestData.startTime) / 1000);

      console.log(timeDifference, "timedifference");

      if (timeDifference < RATE_LIMIT_WINDOW) {
        if (requestData.count < RATE_LIMIT) {
          // Increment request count
          requestData.count += 1;
          await redisClient.hSet(key, 'count', requestData.count);

          return res.json({
            status: 200,
            message: `Data found in cache. Current request count: ${requestData.count}`
          });
        } else {
          // Too many requests
          return res.status(429).json({
            status: 429,
            message: `Rate limit exceeded. Total requests: ${requestData.count} within ${RATE_LIMIT_WINDOW} seconds`
          });
        }
      } else {
        // Reset the counter after time window passes
        requestData = { count: 1, startTime: Date.now() };
        await redisClient.hSet(key, 'count', requestData.count);
        await redisClient.hSet(key, 'startTime', requestData.startTime);

        return res.json({
          status: 200,
          message: `Time window expired. Count reset.`
        });
      }
    }
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).json({
      status: 500,
      msg: 'Internal Server Error'
    });
  }
};

/* GET home page. */
router.get('/', rateLimiter);

module.exports = router;
