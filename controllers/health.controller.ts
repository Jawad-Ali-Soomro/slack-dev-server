import { Request, Response } from 'express';
import { catchAsync } from '../middlewares';
import redisService from '../services/redis.service';

export const healthCheck = catchAsync(async (req: Request, res: Response) => {
  try {

    const redisPing = await redisService.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          status: 'connected',
          ping: redisPing
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    });
  }
});

export const redisStats = catchAsync(async (req: Request, res: Response) => {
  try {

    const info = await redisService.get('redis:info') || {};
    
    res.status(200).json({
      status: 'success',
      redis: {
        connected: true,
        info
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get Redis stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const clearCache = catchAsync(async (req: Request, res: Response) => {
  try {
    const { pattern } = req.query;
    
    if (pattern) {
      await redisService.invalidatePattern(pattern as string);
      res.status(200).json({
        status: 'success',
        message: `Cache cleared for pattern: ${pattern}`
      });
    } else {

      await redisService.invalidatePattern('*');
      res.status(200).json({
        status: 'success',
        message: 'All cache cleared'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

