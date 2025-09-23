import express from 'express'
const notificationRouter = express.Router()
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the current user
 *     tags:
 *       - Notifications
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
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
notificationRouter.get('/', authenticate, getNotifications)

/**
 * @openapi
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
notificationRouter.put('/:notificationId/read', authenticate, markAsRead)

/**
 * @openapi
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
notificationRouter.put('/read-all', authenticate, markAllAsRead)

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
notificationRouter.delete('/:notificationId', authenticate, deleteNotification)

export default notificationRouter