import express from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import enhancedTaskRouter from './enhanced.task.routes'
import enhancedMeetingRouter from './enhanced.meeting.routes'
import followRouter from './follow.routes'
import notificationRouter from './notification.routes'
const router = express.Router()

router.use("/auth", authRouter)
router.use("/user", userRouter)
router.use("/users", userRouter)
router.use("/tasks", enhancedTaskRouter)
router.use("/meetings", enhancedMeetingRouter)
router.use("/notifications", notificationRouter)
router.use("/follow", followRouter)

export default router