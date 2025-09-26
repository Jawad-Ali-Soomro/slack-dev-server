"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userRouter = express_1.default.Router();
const user_controller_1 = require("../controllers/user.controller");
const middlewares_1 = require("../middlewares");
/**
 * @openapi
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
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
 *               username:
 *                 type: string
 *                 example: newusername
 *               bio:
 *                 type: string
 *                 example: Full-stack developer passionate about creating amazing apps
 *               userLocation:
 *                 type: string
 *                 example: San Francisco, CA
 *               website:
 *                 type: string
 *                 example: https://johndoe.dev
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   twitter:
 *                     type: string
 *                     example: https://twitter.com/johndoe
 *                   linkedin:
 *                     type: string
 *                     example: https://linkedin.com/in/johndoe
 *                   github:
 *                     type: string
 *                     example: https://github.com/johndoe
 *                   instagram:
 *                     type: string
 *                     example: https://instagram.com/johndoe
 *                   facebook:
 *                     type: string
 *                     example: https://facebook.com/johndoe
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 1990-01-15
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Username already taken
 *       401:
 *         description: Unauthorized
 */
/**
 * @openapi
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.get('/profile', middlewares_1.authenticate, user_controller_1.getProfile);
userRouter.put('/profile', middlewares_1.authenticate, user_controller_1.updateProfile);
/**
 * @openapi
 * /api/user/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */
userRouter.post('/avatar', middlewares_1.authenticate, (req, res, next) => {
    req.params.folder = 'profiles';
    next();
}, middlewares_1.upload.single('avatar'), user_controller_1.uploadAvatar);
/**
 * @openapi
 * /api/user/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *       400:
 *         description: No avatar to delete
 *       401:
 *         description: Unauthorized
 */
userRouter.delete('/avatar', middlewares_1.authenticate, user_controller_1.deleteAvatar);
/**
 * @openapi
 * /api/user/change-password:
 *   put:
 *     summary: Change user password
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
 *               currentPassword:
 *                 type: string
 *                 example: currentpassword123
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *             required:
 *               - currentPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *       401:
 *         description: Unauthorized
 */
userRouter.put('/change-password', middlewares_1.authenticate, user_controller_1.changePassword);
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users with pagination and search
 *     tags:
 *       - Users
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *     responses:
 *       200:
 *         description: List of users
 */
userRouter.get('/', middlewares_1.authenticate, user_controller_1.getUsers);
/**
 * @openapi
 * /api/users/search:
 *   get:
 *     summary: Search users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for username or email
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search query is required
 */
userRouter.get('/search', middlewares_1.authenticate, user_controller_1.searchUsers);
/**
 * @openapi
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Users
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
 *         description: User details
 *       404:
 *         description: User not found
 */
userRouter.get('/:userId', middlewares_1.authenticate, user_controller_1.getUserById);
exports.default = userRouter;
