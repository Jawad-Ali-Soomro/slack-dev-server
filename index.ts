import "./config/env";
import express from 'express'
import { createServer } from 'http'
import dns from "dns";
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import cors from 'cors'
import compression from 'compression'

import { logger, swaggerOptions } from './helpers/index'
import { dbConnection } from './config/index'
import router from './routes/index'
import SocketService from './services/socketService'
import { startTaskStatusConsumer } from './services/taskQueue'
import { startWorkspaceStatusConsumer } from './services/workspaceStatusQueue'
import { startChatNotificationConsumer } from './services/chatNotificationQueue'
import { startChatReadConsumer } from './services/chatReadQueue'
import redisService from './services/redis.service'
import './services/cron'
import { securityHeaders, sanitizeResponse } from './middlewares/index'
import { requestLogger } from './helpers/logger'

dns.setDefaultResultOrder("verbatim");

const app = express()
const server = createServer(app)

app.use(compression())

logger.info(`Server ${process.pid} starting`)

dbConnection()

const swaggerSpec = swaggerJSDoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use(requestLogger)

if (redisService.isEnabled()) {
  redisService.ping()
    .then(() => logger.info('Redis connected'))
    .catch((error) => logger.error('Redis failed:', error))
} else {
  logger.info('Redis disabled — skipping connection')
}

process.on("uncaughtException", (err) => {
  logger.error(`uncaught exception: ${err.message}`)
  process.exit(1)
})

process.on("unhandledRejection", (err: Error) => {
  logger.error(`unhandled rejection: ${err.message}`)
  process.exit(1)
})

app.use(securityHeaders)
app.use(sanitizeResponse)

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}))

app.use(express.static('public'))
app.use('/profiles', express.static('uploads/profiles'))
app.use('/projects', express.static('uploads/projects'))
app.use('/uploads/posts', express.static('uploads/posts'))
app.use('/uploads/documents', express.static('uploads/documents'))
app.use('/uploads/chat', express.static('uploads/chat', {
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'inline')
    }
  },
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use("/api", router)

app.get("/", (req, res) => {
  res.end("Hello")
})

const socketService = new SocketService(server)
;(global as any).socketService = socketService
startTaskStatusConsumer()
startWorkspaceStatusConsumer()
startChatNotificationConsumer()
startChatReadConsumer()

const PORT = Number(process.env.PORT)

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server is running on port ${PORT}`)
})
