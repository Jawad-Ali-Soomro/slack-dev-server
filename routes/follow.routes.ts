import express from 'express'
const followRouter = express.Router()
import { 
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserFollowStats,
  checkFollowStatus,
  getFollowNotifications
} from '../controllers/follow.controller'

import { authenticate } from '../middlewares/index'
// global authentication middleware
followRouter.use(authenticate)
followRouter.post('/', followUser)
followRouter.delete('/:userId', unfollowUser)
followRouter.get('/:userId/followers', getFollowers)
followRouter.get('/:userId/following', getFollowing)
followRouter.get('/:userId/stats', getUserFollowStats)
followRouter.get('/:userId/status', checkFollowStatus)
followRouter.get('/notifications', getFollowNotifications)

export default followRouter
