import express from 'express'
import { createServer } from 'http'
const app = express()
const server = createServer(app)
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import { logger, swaggerOptions } from './helpers'
import { dbConnection } from './config'
import router from './routes'
import cors from 'cors'
import SocketService from './services/socketService'
import redisService from './services/redis.service'
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
dotenv.config({
    path: './config/.env'
})
logger.info('server requested')
dbConnection()

// Initialize Redis connection
redisService.ping().then(() => {
  logger.info('Redis connection established')
}).catch((error) => {
  logger.error('Redis connection failed:', error)
})
process.on("uncaughtException", (err, next) => {
  logger.error(`uncaught exception: ${err.message}`);
  process.exit(1);
})
process.on("unhandledRejection", (err: Error, next) => {
  logger.error(`unhandled rejection: ${err.message}`);
  process.exit(1);
})
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
}))
logger.info(`cors is running on ${process.env.FRONTEND_URL}`)
app.use(express.static('public'))
app.use('/profiles', express.static('uploads/profiles'))
app.use('/projects', express.static('uploads/projects'))
app.use('/uploads/posts', express.static('uploads/posts'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api", router)

// Initialize Socket.IO
const socketService = new SocketService(server);

// Make socketService available globally for use in controllers
(global as any).socketService = socketService;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`🔌 Socket.IO server ready for connections`)
})
