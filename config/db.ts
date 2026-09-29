import { logger } from "../helpers/index";
import mongoose from "mongoose";
const MAX_RETRIES = Number(process.env.DB_MAX_RETRIES);
const RETRY_DELAY_MS = Number(process.env.DB_TIMEOUT);

export const dbConnection = async (attempt = 1): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI as string

  try {
    await mongoose.connect(mongoUri);
    logger.info(`connected database: ${mongoose.connection.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`database connection error (attempt ${attempt}/${MAX_RETRIES}): ${message}`);

    if (attempt < MAX_RETRIES) {
      logger.info(`Retrying MongoDB connection in ${RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return dbConnection(attempt + 1);
    }

    logger.error('MongoDB connection failed after retries. Is Atlas reachable, or use local MONGODB_URI?');
    process.exit(1);
  }
};
