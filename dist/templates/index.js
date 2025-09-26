"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResetPasswordEmail = exports.buildOtpEmail = void 0;
const verifyEmail_1 = require("./verifyEmail");
Object.defineProperty(exports, "buildOtpEmail", { enumerable: true, get: function () { return verifyEmail_1.buildOtpEmail; } });
const resetPassword_1 = require("./resetPassword");
Object.defineProperty(exports, "buildResetPasswordEmail", { enumerable: true, get: function () { return resetPassword_1.buildResetPasswordEmail; } });
