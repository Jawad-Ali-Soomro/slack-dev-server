"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const followRouter = express_1.default.Router();
const follow_controller_1 = require("../controllers/follow.controller");
const middlewares_1 = require("../middlewares");
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
followRouter.post('/', middlewares_1.authenticate, follow_controller_1.followUser);
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
followRouter.delete('/:userId', middlewares_1.authenticate, follow_controller_1.unfollowUser);
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
followRouter.get('/:userId/followers', middlewares_1.authenticate, follow_controller_1.getFollowers);
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
followRouter.get('/:userId/following', middlewares_1.authenticate, follow_controller_1.getFollowing);
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
followRouter.get('/:userId/stats', middlewares_1.authenticate, follow_controller_1.getUserFollowStats);
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
followRouter.get('/:userId/status', middlewares_1.authenticate, follow_controller_1.checkFollowStatus);
/**
 * @openapi
 * /api/user/follow/notifications:
 *   get:
 *     summary: Get follow-related notifications
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of follow-related notifications
 */
followRouter.get('/notifications', middlewares_1.authenticate, follow_controller_1.getFollowNotifications);
exports.default = followRouter;
