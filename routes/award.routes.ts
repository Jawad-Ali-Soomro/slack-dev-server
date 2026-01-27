import express from 'express';
import { authenticate } from '../middlewares';
import {
  getUserAwards,
  getAllAwards,
} from '../controllers/award.controller';

const router = express.Router();

router.use(authenticate);

router.get('/my-awards', getUserAwards);

router.get('/all', getAllAwards);

export default router;

