"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = exports.generateOtp = exports.sendMail = void 0;
const sendMail_1 = __importDefault(require("./sendMail"));
exports.sendMail = sendMail_1.default;
const generateOtp_1 = __importDefault(require("./generateOtp"));
exports.generateOtp = generateOtp_1.default;
const catchAsync_1 = require("./catchAsync");
Object.defineProperty(exports, "catchAsync", { enumerable: true, get: function () { return catchAsync_1.catchAsync; } });
