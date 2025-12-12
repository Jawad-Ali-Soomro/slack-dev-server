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

// All routes require authentication
router.use(authenticate);

// Get categories
router.get('/categories', getCategories);

// Get user's completed challenges
router.get('/my-challenges', getMyChallenges);

// Get all challenges
router.get('/', getChallenges);

// Get challenge by ID
router.get('/:id', getChallengeById);

// Create challenge
router.post('/', createChallenge);

// Update challenge
router.put('/:id', updateChallenge);

// Delete challenge
router.delete('/:id', deleteChallenge);

// Submit solution
router.post('/:id/submit', submitSolution);

export default router;


