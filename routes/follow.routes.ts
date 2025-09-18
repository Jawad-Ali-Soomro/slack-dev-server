import express from 'express'
const followRouter = express.Router()
import { 
  followUser, 
  unfollowUser, 
  acceptFollowRequest, 
  rejectFollowRequest,
  getFollowers,
  getFollowing,
  getFollowRequests,
  getUserFollowStats
} from '../controllers/follow.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/follow/user:
 *   post:
 *     summary: Follow a user
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109ca
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: User followed or follow request sent
 *       400:
 *         description: Cannot follow yourself or already following
 *       404:
 *         description: User not found
 */
followRouter.post('/user', authenticate, followUser)

/**
 * @openapi
 * /api/follow/user/{userId}:
 *   delete:
 *     summary: Unfollow a user
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *       404:
 *         description: Not following this user
 */
followRouter.delete('/user/:userId', authenticate, unfollowUser)

/**
 * @openapi
 * /api/follow/request/{followId}/accept:
 *   post:
 *     summary: Accept follow request
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109cb
 *     responses:
 *       200:
 *         description: Follow request accepted
 *       404:
 *         description: Follow request not found
 */
followRouter.post('/request/:followId/accept', authenticate, acceptFollowRequest)

/**
 * @openapi
 * /api/follow/request/{followId}/reject:
 *   post:
 *     summary: Reject follow request
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109cb
 *     responses:
 *       200:
 *         description: Follow request rejected
 *       404:
 *         description: Follow request not found
 */
followRouter.post('/request/:followId/reject', authenticate, rejectFollowRequest)

/**
 * @openapi
 * /api/follow/{userId}/followers:
 *   get:
 *     summary: Get user followers
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of followers
 */
followRouter.get('/:userId/followers', authenticate, getFollowers)

/**
 * @openapi
 * /api/follow/{userId}/following:
 *   get:
 *     summary: Get user following
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of following users
 */
followRouter.get('/:userId/following', authenticate, getFollowing)

/**
 * @openapi
 * /api/follow/requests:
 *   get:
 *     summary: Get pending follow requests
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending follow requests
 */
followRouter.get('/requests', authenticate, getFollowRequests)

/**
 * @openapi
 * /api/follow/{userId}/stats:
 *   get:
 *     summary: Get user follow statistics
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: User follow statistics
 */
followRouter.get('/:userId/stats', authenticate, getUserFollowStats)

export default followRouter
