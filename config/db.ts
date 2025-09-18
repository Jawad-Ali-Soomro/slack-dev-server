import { logger } from "../helpers";
import mongoose from "mongoose";

export const dbConnection = () => {
  mongoose
    .connect(process.env.MONGODB_URI as string)
    .then(() => {
      logger.info("connected database");
      console.log("connected database");
    })
    .catch((error) => {
      logger.error(error);
      console.log("database connection error", error);
      process.exit(1);
    });
};
