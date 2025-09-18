import express from 'express'
const notificationRouter = express.Router()
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount
} from '../controllers/notification.controller'
import { authenticate } from '../middlewares'

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
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
 *         description: List of notifications with pagination
 */
notificationRouter.get('/', authenticate, getNotifications)

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notifications count
 */
notificationRouter.get('/unread-count', authenticate, getUnreadCount)

/**
 * @openapi
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
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
 *         example: 60d0fe4f5311236168a109cc
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
notificationRouter.put('/:notificationId/read', authenticate, markNotificationAsRead)

/**
 * @openapi
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
notificationRouter.put('/mark-all-read', authenticate, markAllNotificationsAsRead)

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
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
 *         example: 60d0fe4f5311236168a109cc
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 */
notificationRouter.delete('/:notificationId', authenticate, deleteNotification)

export default notificationRouter
