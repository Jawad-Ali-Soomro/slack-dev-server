import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redis.service';
import { logger } from '../helpers';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum number of requests
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Get client identifier (IP address or user ID)
 */
function getClientId(req: Request): string {
  // Try to get user ID if authenticated
  if ((req as any).user && (req as any).user._id) {
    return `user:${(req as any).user._id}`;
  }
  
  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket.remoteAddress || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Redis-based rate limiter middleware
 * Prevents DDoS attacks by limiting requests per time window
 */
export const rateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getClientId(req);
      const key = `ratelimit:${clientId}:${req.method}:${req.path}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      // Get current request count (using getString for rate limiting)
      const current = await redisService.getString(key);
      const count = current ? parseInt(current, 10) : 0;

      // Check if limit exceeded
      if (count >= maxRequests) {
        logger.warn(`Rate limit exceeded for ${clientId} on ${req.method} ${req.path}`);
        
        // Calculate retry after
        const ttl = await redisService.getTtl(key);
        const retryAfter = ttl > 0 ? Math.ceil(ttl) : windowSeconds;

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
          error: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // Increment counter
      const newCount = count + 1;
      await redisService.setString(key, newCount.toString(), windowSeconds);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - newCount).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      // Store original methods
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);

      // Override res.json to track successful/failed requests
      res.json = function(data: any) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const isError = statusCode >= 400;

        // Decrement on successful requests if configured
        if (skipSuccessfulRequests && isSuccess) {
          redisService.decrement(key).catch(err => {
            logger.error('Failed to decrement rate limit:', err);
          });
        }

        // Decrement on failed requests if configured
        if (skipFailedRequests && isError) {
          redisService.decrement(key).catch(err => {
            logger.error('Failed to decrement rate limit:', err);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow request to proceed (fail open)
      next();
    }
  };
};

/**
 * General API rate limiter (100 requests per 15 minutes)
 */
export const generalRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});

/**
 * Strict rate limiter for authentication endpoints (5 requests per 15 minutes)
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true
});

/**
 * Strict rate limiter for sensitive operations (10 requests per hour)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Too many requests, please try again after 1 hour.'
});

