import express from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import taskRouter from './task.routes'
import followRouter from './follow.routes'
import notificationRouter from './notification.routes'
const router = express.Router()

router.use("/auth", authRouter)
router.use("/user", userRouter)
router.use("/user/follow", followRouter)
router.use("/tasks", taskRouter)
router.use("/notifications", notificationRouter)

export default router