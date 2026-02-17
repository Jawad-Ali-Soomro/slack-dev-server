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
import './services/cron'
import { 
  securityHeaders, 
  sanitizeResponse 
} from './middlewares'
import { requestLogger } from './helpers/logger'

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
dotenv.config({
    path: './config/.env'
})
logger.info('server requested')
dbConnection()

app.use(requestLogger)

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
app.use(securityHeaders);

app.use(sanitizeResponse);

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
}))

app.use(express.static('public'))
app.use('/profiles', express.static('uploads/profiles'))
app.use('/projects', express.static('uploads/projects'))
app.use('/uploads/posts', express.static('uploads/posts'))
app.use('/uploads/documents', express.static('uploads/documents'))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use("/api", router)

const socketService = new SocketService(server);

(global as any).socketService = socketService;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`server is running & socket is ready for connections`)
})
