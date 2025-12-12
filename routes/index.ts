import express from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import enhancedTaskRouter from './enhanced.task.routes'
import enhancedMeetingRouter from './enhanced.meeting.routes'
import followRouter from './follow.routes'
import notificationRouter from './notification.routes'
import projectRouter from './project.routes'
import teamRouter from './team.routes'
import friendRouter from './friend.routes'
import chatRouter from './chat.routes'
import postRouter from './post.routes'
import uploadRouter from './upload.routes'
import permissionsRouter from './permissions.routes'
import healthRouter from './health.routes'
import exploreRouter from './explore.routes'
import noteRouter from './note.routes'
import challengeRouter from './challenge.routes'
import awardRouter from './award.routes'
const router = express.Router()

router.use("/auth", authRouter)
router.use("/user", userRouter)
router.use("/users", userRouter)
router.use("/tasks", enhancedTaskRouter)
router.use("/meetings", enhancedMeetingRouter)
router.use("/notifications", notificationRouter)
router.use("/follow", followRouter)
router.use("/projects", projectRouter)
router.use("/teams", teamRouter)
router.use("/friends", friendRouter)
router.use("/chat", chatRouter)
router.use("/posts", postRouter)
router.use("/upload", uploadRouter)
router.use("/explore", exploreRouter)
router.use("/permissions", permissionsRouter)
router.use("/health", healthRouter)
router.use("/notes", noteRouter)
router.use("/challenges", challengeRouter)
router.use("/awards", awardRouter)

export default router