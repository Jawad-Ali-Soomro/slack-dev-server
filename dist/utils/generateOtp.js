"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};
exports.default = generateOtp;
