import express from 'express'
const followRouter = express.Router()
import { 
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserFollowStats,
  checkFollowStatus
} from '../controllers/follow.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/user/follow:
 *   post:
 *     summary: Follow a user
 *     tags:
 *       - User
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
 *         description: User followed successfully
 *       400:
 *         description: Cannot follow yourself or already following
 *       404:
 *         description: User not found
 */
followRouter.post('/', authenticate, followUser)

/**
 * @openapi
 * /api/user/follow/{userId}:
 *   delete:
 *     summary: Unfollow a user
 *     tags:
 *       - User
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
 *         description: User not found
 */
followRouter.delete('/:userId', authenticate, unfollowUser)

/**
 * @openapi
 * /api/user/follow/{userId}/followers:
 *   get:
 *     summary: Get user followers
 *     tags:
 *       - User
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
 *       404:
 *         description: User not found
 */
followRouter.get('/:userId/followers', authenticate, getFollowers)

/**
 * @openapi
 * /api/user/follow/{userId}/following:
 *   get:
 *     summary: Get user following
 *     tags:
 *       - User
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
 *       404:
 *         description: User not found
 */
followRouter.get('/:userId/following', authenticate, getFollowing)

/**
 * @openapi
 * /api/user/follow/{userId}/stats:
 *   get:
 *     summary: Get user follow statistics
 *     tags:
 *       - User
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
 *       404:
 *         description: User not found
 */
followRouter.get('/:userId/stats', authenticate, getUserFollowStats)

/**
 * @openapi
 * /api/user/follow/{userId}/status:
 *   get:
 *     summary: Check follow status between current user and target user
 *     tags:
 *       - User
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
 *         description: Follow status information
 *       404:
 *         description: User not found
 */
followRouter.get('/:userId/status', authenticate, checkFollowStatus)

export default followRouter
