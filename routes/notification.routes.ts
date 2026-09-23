import express from 'express'
const notificationRouter = express.Router()
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller'


import { authenticate } from '../middlewares/index'
// global authentication middleware
notificationRouter.use(authenticate)
notificationRouter.get('/', getNotifications)
notificationRouter.put('/:notificationId/read', markAsRead)
notificationRouter.put('/read-all', markAllAsRead)
notificationRouter.delete('/:notificationId', deleteNotification)

export default notificationRouter