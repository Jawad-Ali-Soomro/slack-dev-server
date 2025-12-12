import express from 'express';
import { authenticate } from '../middlewares';
import {
  getUserAwards,
  getAllAwards,
} from '../controllers/award.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user's awards
router.get('/my-awards', getUserAwards);

// Get all available awards
router.get('/all', getAllAwards);

export default router;

