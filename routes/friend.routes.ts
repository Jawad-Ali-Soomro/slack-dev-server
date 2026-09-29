import express from 'express'
import { authenticate } from '../middlewares/index'
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
// global authentication middleware
friendRouter.use(authenticate)

friendRouter.post('/request', sendFriendRequest)
friendRouter.get('/requests', getFriendRequests)
friendRouter.post('/respond', respondToFriendRequest)
friendRouter.get('/', getFriends)
friendRouter.delete('/:friendId', removeFriend)
friendRouter.get('/stats', getFriendStats)
friendRouter.get('/search', searchUsersForFriends)

export default friendRouter

