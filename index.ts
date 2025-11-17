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
import { 
  securityHeaders, 
  sanitizeResponse, 
  generalRateLimiter 
} from './middlewares'

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
// Security headers - apply first
app.use(securityHeaders);

// Response sanitization
app.use(sanitizeResponse);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
}))
logger.info(`cors is running on ${process.env.FRONTEND_URL}`)

// Static files
app.use(express.static('public'))
app.use('/profiles', express.static('uploads/profiles'))
app.use('/projects', express.static('uploads/projects'))
app.use('/uploads/posts', express.static('uploads/posts'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// General rate limiting for all API routes
app.use('/api', generalRateLimiter);

// API routes
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
