import express from 'express'
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
    env: process.env.NODE_ENV 
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
