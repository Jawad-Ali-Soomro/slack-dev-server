import winston from "winston";
import path from "path";
import fs from "fs";
import os from "os";
import { networkInterfaces } from "os";

import dotenv from 'dotenv'
dotenv.config({ path: './config/.env' });

const LOG_ENABLED = process.env.LOG_ENABLED === "true";



const logDirectory = path.join(__dirname, "../logs");
if (LOG_ENABLED && !fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

function getNetworkInfo() {
  const nets = networkInterfaces();
  const results: { [name: string]: string[] } = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  return results;
}

const hostname = os.hostname();
const networkInfo = getNetworkInfo();

const transports: winston.transport[] = [];

if (LOG_ENABLED) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDirectory, "success.log"),
      level: "info",
    }),
    new winston.transports.File({
      filename: path.join(logDirectory, "combined.log"),
    })
  );
} else {
  transports.push(new winston.transports.Console());
}

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message} ~ host: ${hostname} ~ network address: ${JSON.stringify(networkInfo)}`;
    })
  ),
  transports,
});
