import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import { logger, swaggerOptions } from './helpers'
import { dbConnection } from './config'
import router from './routes'

// Load environment variables
dotenv.config()

const app = express()

// Swagger setup
const swaggerSpec = swaggerJSDoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Database connection
dbConnection()

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use('/profiles', express.static('uploads/profiles'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/api", router)

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    availableRoutes: [
      'GET /',
      'GET /api-docs',
      'POST /api/auth/*',
      'GET /api/user/*',
      'POST /api/user/follow/*',
      'GET /api/notifications/*'
    ]
  })
})

// Catch-all handler for debugging
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    availableRoutes: [
      'GET /',
      'GET /api-docs',
      '/api/auth/*',
      '/api/user/*',
      '/api/user/follow/*',
      '/api/notifications/*'
    ]
  })
})

// Error handling for serverless
process.on("uncaughtException", (err) => {
  logger.error(`uncaught exception: ${err.message}`)
})

process.on("unhandledRejection", (err: Error) => {
  logger.error(`unhandled rejection: ${err.message}`)
})

// Export for Vercel
export default app
