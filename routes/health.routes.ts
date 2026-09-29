import express from 'express';
import { healthCheck, redisStats, clearCache } from '../controllers/health.controller';
import { authenticate } from '../middlewares/index';

const healthRouter = express.Router();
// global authentication middleware
healthRouter.use(authenticate)
healthRouter.get('/health', healthCheck);
healthRouter.get('/redis/stats',  redisStats);
healthRouter.delete('/cache',  clearCache);

export default healthRouter;

