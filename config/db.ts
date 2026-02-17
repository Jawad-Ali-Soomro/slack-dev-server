import { logger } from "../helpers";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: './config/.env' });

export const dbConnection = () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-stack'
  mongoose
    .connect(mongoUri)
    .then(() => {
      logger.info("connected database");
      console.log("connected database", mongoose.connection.name);
    })
    .catch((error) => {
      logger.error(error);
      console.log("database connection error", error);
      process.exit(1);
    });
};
