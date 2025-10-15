import express from 'express'
import { authenticate } from '../middlewares'
import {
  // Repository routes
  createRepository,
  getRepositories,
  getRepository,
  updateRepository,
  deleteRepository,
  // Pull Request routes
  createPullRequest,
  getPullRequests,
  updatePullRequest,
  deletePullRequest,
  // Issue routes
  createIssue,
  getIssues,
  updateIssue,
  deleteIssue,
  // Stats
  getGitHubStats,
  // Friends
  getFriends
} from '../controllers/github.controller'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Stats route
router.get('/stats', getGitHubStats)

// Friends route
router.get('/friends', getFriends)

// Repository routes
router.post('/repositories', createRepository)
router.get('/repositories', getRepositories)
router.get('/repositories/:id', getRepository)
router.put('/repositories/:id', updateRepository)
router.delete('/repositories/:id', deleteRepository)

// Pull Request routes
router.post('/pull-requests', createPullRequest)
router.get('/pull-requests', getPullRequests)
router.put('/pull-requests/:id', updatePullRequest)
router.delete('/pull-requests/:id', deletePullRequest)

// Issue routes
router.post('/issues', createIssue)
router.get('/issues', getIssues)
router.put('/issues/:id', updateIssue)
router.delete('/issues/:id', deleteIssue)

export default router
