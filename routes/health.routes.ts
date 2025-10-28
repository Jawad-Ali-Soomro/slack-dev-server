import { Router } from 'express';
import { healthCheck, redisStats, clearCache } from '../controllers/health.controller';
import { authenticate } from '../middlewares';

const router = Router();

// Health check endpoint (public)
router.get('/health', healthCheck);

// Redis stats endpoint (protected)
router.get('/redis/stats', authenticate, redisStats);

// Cache management endpoints (protected)
router.delete('/cache', authenticate, clearCache);

export default router;

