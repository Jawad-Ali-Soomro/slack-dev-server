import dotenv from 'dotenv';

dotenv.config({
  path: './config/.env'
});

export const redisConfig = {
  enabled: process.env.REDIS_ENABLED === "true",
  url: process.env.REDIS_URL || undefined,
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 10,
  lazyConnect: false,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
  enableOfflineQueue: true,
  sentinels: process.env.REDIS_SENTINELS
    ? JSON.parse(process.env.REDIS_SENTINELS)
    : undefined,
  name: process.env.REDIS_SENTINEL_NAME || undefined,
};

export function createRedisOptions() {
  const {
    enabled: _enabled,
    url,
    host,
    port,
    password,
    sentinels,
    name,
    ...rest
  } = redisConfig;

  if (url) {
    return { url, options: rest };
  }

  return {
    url: undefined as string | undefined,
    options: {
      host,
      port,
      ...(password ? { password } : {}),
      ...(sentinels ? { sentinels, name } : {}),
      ...rest,
    },
  };
}

export default redisConfig;
