const { createClient } = require('redis');
require('dotenv').config()


const redis_pass = process.env.redis_pass

// Initialize Redis client
const client = createClient({
  password: redis_pass,
  socket: {
      host: 'redis-15925.c17.us-east-1-4.ec2.redns.redis-cloud.com',
      port: 15925
  }
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');

    try {
        const data = await client.hGetAll('{ip: 1}');
        console.log('Data:', data);
      } catch (err) {
        console.error('Error:', err);
      }

  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

client.on('error', (err) => {
  console.error('Redis error:', err);
});



module.exports = client
