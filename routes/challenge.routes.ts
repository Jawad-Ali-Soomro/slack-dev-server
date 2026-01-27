import express from 'express';
import { authenticate } from '../middlewares';
import {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  submitSolution,
  getMyChallenges,
  getCategories,
} from '../controllers/challenge.controller';

const router = express.Router();

router.use(authenticate);

router.get('/categories', getCategories);

router.get('/my-challenges', getMyChallenges);

router.get('/', getChallenges);

router.get('/:id', getChallengeById);

router.post('/', createChallenge);

router.put('/:id', updateChallenge);

router.delete('/:id', deleteChallenge);

router.post('/:id/submit', submitSolution);

export default router;


