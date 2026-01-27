// logger.ts
import winston from "winston";
import path from "path";
import fs from "fs";
import os from "os";
import { networkInterfaces } from "os";
import dotenv from "dotenv";
import colors from "colors"; // npm install colors

dotenv.config({ path: "./config/.env" });

const LOG_ENABLED = process.env.LOG_ENABLED === "true";

// --- LOG DIRECTORY ---
const logDirectory = path.join(__dirname, "../logs");
if (LOG_ENABLED && !fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// --- NETWORK INFO ---
function getNetworkInfo() {
  const nets = networkInterfaces();
  const results: { [name: string]: string[] } = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) results[name] = [];
        results[name].push(net.address);
      }
    }
  }
  return results;
}

const hostname = os.hostname();
const networkInfo = getNetworkInfo();

// --- CUSTOM COLORS FOR WINSTON LEVELS ---
const customColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
  silly: "cyan",
};

winston.addColors(customColors);

// --- MULTI-LINE COLORFUL FORMAT ---
const consoleFormat = winston.format.printf((info) => {
  const timestamp = colors.gray(String(info.timestamp));
  const level =
    info.level === "error"
      ? colors.red(info.level.toUpperCase())
      : info.level === "warn"
      ? colors.yellow(info.level.toUpperCase())
      : info.level === "info"
      ? colors.green(info.level.toUpperCase())
      : info.level === "http"
      ? colors.magenta(info.level.toUpperCase())
      : info.level === "debug"
      ? colors.blue(info.level.toUpperCase())
      : colors.cyan(info.level.toUpperCase());

  const message = colors.white(String(info.message));
  const host = colors.cyan(`host: ${hostname}`);
  const network = colors.yellow(`network: ${JSON.stringify(networkInfo, null, 2)}`);

  return `
${timestamp} [${level}]
Message: ${message}
${host}
${network}
`;
});

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
    }),
    new winston.transports.Console({
      level: "silly",
      format: winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), consoleFormat),
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: "silly",
      format: winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), consoleFormat),
    })
  );
}

export const logger = winston.createLogger({
  level: "silly",
  transports,
});

// --- EXPRESS REQUEST LOGGER ---
import { Request, Response, NextFunction } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const { method, originalUrl } = req;
  const clientIp = req.ip || req.connection.remoteAddress;

  logger.info(
    `[HTTP] ${method} ${originalUrl} - Client IP: ${clientIp} - Query: ${JSON.stringify(
      req.query,
      null,
      2
    )} - Body: ${JSON.stringify(req.body, null, 2)}`
  );

  res.on("finish", () => {
    logger.info(`[HTTP] ${method} ${originalUrl} - Status: ${res.statusCode} - Client IP: ${clientIp}`);
  });

  next();
};
