import express from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import followRouter from './follow.routes'
import notificationRouter from './notification.routes'
const router = express.Router()

router.use("/auth", authRouter)
router.use("/user", userRouter)
router.use("/follow", followRouter)
router.use("/notifications", notificationRouter)

export default router