"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const os_2 = require("os");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './config/.env' });
const LOG_ENABLED = process.env.LOG_ENABLED === "true";
const logDirectory = path_1.default.join(__dirname, "../logs");
if (LOG_ENABLED && !fs_1.default.existsSync(logDirectory)) {
    fs_1.default.mkdirSync(logDirectory);
}
function getNetworkInfo() {
    const nets = (0, os_2.networkInterfaces)();
    const results = {};
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
const hostname = os_1.default.hostname();
const networkInfo = getNetworkInfo();
const transports = [];
if (LOG_ENABLED) {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDirectory, "error.log"),
        level: "error",
    }), new winston_1.default.transports.File({
        filename: path_1.default.join(logDirectory, "success.log"),
        level: "info",
    }), new winston_1.default.transports.File({
        filename: path_1.default.join(logDirectory, "combined.log"),
    }));
}
else {
    transports.push(new winston_1.default.transports.Console());
}
exports.logger = winston_1.default.createLogger({
    level: "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.printf((info) => {
        return `${info.timestamp} ${info.level}: ${info.message} ~ host: ${hostname} ~ network address: ${JSON.stringify(networkInfo)}`;
    })),
    transports,
});
