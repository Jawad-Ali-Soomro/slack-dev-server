import express from 'express'
import { authenticate } from '../middlewares'
import { 
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  getFriends,
  removeFriend,
  getFriendStats,
  searchUsersForFriends
} from '../controllers/friend.controller'

const friendRouter = express.Router()

friendRouter.post('/request', authenticate, sendFriendRequest)

friendRouter.get('/requests', authenticate, getFriendRequests)

friendRouter.post('/respond', authenticate, respondToFriendRequest)

friendRouter.get('/', authenticate, getFriends)

friendRouter.delete('/:friendId', authenticate, removeFriend)

friendRouter.get('/stats', authenticate, getFriendStats)

friendRouter.get('/search', authenticate, searchUsersForFriends)

export default friendRouter

