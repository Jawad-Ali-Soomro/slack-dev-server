"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnection = void 0;
const helpers_1 = require("../helpers");
const mongoose_1 = __importDefault(require("mongoose"));
const dbConnection = () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-stack';
    mongoose_1.default
        .connect(mongoUri)
        .then(() => {
        helpers_1.logger.info("connected database");
        console.log("connected database");
    })
        .catch((error) => {
        helpers_1.logger.error(error);
        console.log("database connection error", error);
        process.exit(1);
    });
};
exports.dbConnection = dbConnection;
