import express from 'express'
const userRouter = express.Router()
import { updateProfile, uploadAvatar, deleteAvatar, changePassword } from '../controllers/user.controller'
import { authenticate, upload } from '../middlewares'

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
userRouter.put('/profile', authenticate, updateProfile)

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
userRouter.post('/avatar', authenticate, (req, res, next) => {
  req.params.folder = 'profiles';
  next();
}, upload.single('avatar'), uploadAvatar)

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
userRouter.delete('/avatar', authenticate, deleteAvatar)

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
userRouter.put('/change-password', authenticate, changePassword)

export default userRouter
