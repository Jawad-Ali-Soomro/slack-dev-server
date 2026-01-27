import { Router } from 'express';
import { healthCheck, redisStats, clearCache } from '../controllers/health.controller';
import { authenticate } from '../middlewares';

const router = Router();

router.get('/health', healthCheck);

router.get('/redis/stats', authenticate, redisStats);

router.delete('/cache', authenticate, clearCache);

export default router;

