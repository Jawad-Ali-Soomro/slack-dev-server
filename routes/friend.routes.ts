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

// Send friend request
friendRouter.post('/request', authenticate, sendFriendRequest)

// Get friend requests
friendRouter.get('/requests', authenticate, getFriendRequests)

// Respond to friend request
friendRouter.post('/respond', authenticate, respondToFriendRequest)

// Get friends list
friendRouter.get('/', authenticate, getFriends)

// Remove friend
friendRouter.delete('/:friendId', authenticate, removeFriend)

// Get friend stats
friendRouter.get('/stats', authenticate, getFriendStats)

// Search users for friend requests
friendRouter.get('/search', authenticate, searchUsersForFriends)

export default friendRouter

