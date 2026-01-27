import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redis.service';
import { logger } from '../helpers';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    [key: string]: any;
  };
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: AuthenticatedRequest) => string;
  skipCache?: (req: AuthenticatedRequest) => boolean;
}

export const redisCache = (options: CacheOptions = {}) => {
  const { ttl = 300, keyGenerator, skipCache } = options; // Default 5 minutes

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {

      if (skipCache && skipCache(req)) {
        return next();
      }

      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `cache:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

      const cached = await redisService.get(cacheKey);
      
      if (cached) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        return res.status(200).json(cached);
      }

      const originalJson = res.json.bind(res);

      res.json = function(data: any) {

        redisService.set(cacheKey, data, ttl).catch(error => {
          logger.error('Failed to cache response:', error);
        });
        
        logger.info(`Cached response for key: ${cacheKey}`);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Redis cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

export const userCache = redisCache({
  ttl: 600, // 10 minutes
  keyGenerator: (req) => `user:${req.user?._id}:${req.originalUrl}`,
  skipCache: (req) => req.method !== 'GET'
});

export const dashboardCache = redisCache({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => `dashboard:${req.user?._id}:${JSON.stringify(req.query)}`,
  skipCache: (req) => req.method !== 'GET'
});

export const searchCache = redisCache({
  ttl: 180, // 3 minutes
  keyGenerator: (req) => `search:${req.originalUrl}:${JSON.stringify(req.query)}`,
  skipCache: (req) => req.method !== 'GET'
});

export const invalidateUserCache = async (userId: string) => {
  try {
    await redisService.invalidateUserData(userId);
    logger.info(`Invalidated cache for user: ${userId}`);
  } catch (error) {
    logger.error('Failed to invalidate user cache:', error);
  }
};

export const invalidateCachePattern = async (pattern: string) => {
  try {
    await redisService.invalidatePattern(pattern);
    logger.info(`Invalidated cache pattern: ${pattern}`);
  } catch (error) {
    logger.error('Failed to invalidate cache pattern:', error);
  }
};
