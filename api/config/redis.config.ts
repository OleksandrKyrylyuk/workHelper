import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
});

redis.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
});

export default redis;
