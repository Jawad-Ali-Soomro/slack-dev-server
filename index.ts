import cluster from 'cluster'
import os from 'os'
import express from 'express'
import { createServer } from 'http'
import dotenv from 'dotenv'
import dns from "dns";
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import cors from 'cors'

import { logger, swaggerOptions } from './helpers'
import { dbConnection } from './config'
import router from './routes'
import SocketService from './services/socketService'
import redisService from './services/redis.service'
import './services/cron'
import { securityHeaders, sanitizeResponse } from './middlewares'
import { requestLogger } from './helpers/logger'

dns.setDefaultResultOrder("verbatim");

dotenv.config({
  path: './config/.env'
})

const numCPUs = os.cpus().length

// 🔥 MASTER PROCESS
if (cluster.isPrimary) {
  logger.info(`Master ${process.pid} is running`)
  logger.info(`Forking ${numCPUs} workers...`)

  // Create workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  // Restart crashed workers
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died`)
    logger.info(`Starting a new worker...`)
    cluster.fork()
  })

} else {

  // 🚀 WORKER PROCESS
  const app = express()
  const server = createServer(app)

  logger.info(`Worker ${process.pid} started`)

  dbConnection()

  const swaggerSpec = swaggerJSDoc(swaggerOptions)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  app.use(requestLogger)

  redisService.ping()
    .then(() => logger.info('Redis connected'))
    .catch((error) => logger.error('Redis failed:', error))

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
    origin: "*",
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

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  app.use("/api", router)

  app.get("/", (req,res) => {
    res.end("Hello")
  })

  const socketService = new SocketService(server)
  ;(global as any).socketService = socketService

  const PORT = Number(process.env.PORT)|| 5000

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`Worker ${process.pid} running on port ${PORT}`)
  })
}