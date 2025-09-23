import express from 'express'
const app = express()
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import { logger, swaggerOptions } from './helpers'
import { dbConnection } from './config'
import router from './routes'
import cors from 'cors'
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
dotenv.config({
    path: './config/.env'
})
logger.info('server requested')
dbConnection()
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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api", router)
app.listen(process.env.PORT as String, () => {
  console.log(`server is running working on port ${process.env.PORT}`)
})

export default app