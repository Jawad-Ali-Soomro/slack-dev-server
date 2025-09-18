import express from 'express'
const app = express()
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import { logger, swaggerOptions } from './helpers'
import { dbConnection } from './config'
import router from './routes'
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
app.use(express.static('public'))
app.use('/profiles', express.static('uploads/profiles'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api", router)
app.listen(process.env.PORT as String, () => {
  console.log(`server is running working`)
})