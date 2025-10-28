import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: './config/.env'
});

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Redis cluster configuration (if using cluster)
  enableOfflineQueue: false,
  // Redis sentinel configuration (if using sentinel)
  sentinels: process.env.REDIS_SENTINELS ? JSON.parse(process.env.REDIS_SENTINELS) : undefined,
  name: process.env.REDIS_SENTINEL_NAME,
  // Redis URL (alternative to host/port)
  url: process.env.REDIS_URL,
};

export default redisConfig;
