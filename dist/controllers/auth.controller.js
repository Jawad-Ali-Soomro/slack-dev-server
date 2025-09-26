"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.resetPassword = exports.forgotPassword = exports.resendOtp = exports.verifyEmail = exports.login = exports.register = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
const utils_1 = require("../utils");
const templates_1 = require("../templates");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
    path: "../config/.env"
});
const formatUserResponse = (user) => ({
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    isPrivate: user.isPrivate,
});
exports.register = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { email, username } = req.body;
    const findUserByEmail = await models_1.User.findOne({ email });
    if (findUserByEmail) {
        return res.status(400).json({ message: "email already in use" });
    }
    const findUserByUsername = await models_1.User.findOne({ username });
    if (findUserByUsername) {
        return res.status(400).json({ message: "username already taken" });
    }
    const emailVerificationToken = (0, utils_1.generateOtp)();
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { html, text } = (0, templates_1.buildOtpEmail)({
        otp: emailVerificationToken,
        username: username,
        supportEmail: "support@slackdev.com",
        siteName: "Slack Dev",
        buttonText: "Verify Email",
        buttonUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
        logoUrl: `${process.env.BASE_URL || 'http://localhost:4000'}/logo.png`
    });
    (0, utils_1.sendMail)({
        subject: "Verify Email",
        to: email,
        text,
        html,
        attachments: [{
                filename: 'logo.png',
                path: path_1.default.join(__dirname, '../public/logo.png'),
                cid: 'logo'
            }]
    });
    try {
        const user = await models_1.User.create({
            ...req.body,
            emailVerificationToken,
            emailVerificationTokenExpires
        });
        const token = (0, middlewares_1.generateToken)({ id: user._id });
        res.status(201).json({
            message: "user registered successfully",
            token,
            user: formatUserResponse(user)
        });
    }
    catch (err) {
        if (err.code === 11000) {
            if (err.keyPattern?.username) {
                return res.status(400).json({ message: "username already taken" });
            }
            if (err.keyPattern?.email) {
                return res.status(400).json({ message: "email already in use" });
            }
            return res.status(400).json({ message: "duplicate key error" });
        }
        throw err;
    }
});
exports.login = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { email, password } = req.body;
    const user = await models_1.User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: "invalid credentials" });
    }
    if (!user.emailVerified) {
        // Generate new verification token
        const emailVerificationToken = (0, utils_1.generateOtp)();
        const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Update user with new token
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationTokenExpires = emailVerificationTokenExpires;
        await user.save();
        // Send verification email
        const { html, text } = (0, templates_1.buildOtpEmail)({
            otp: emailVerificationToken,
            username: user.username,
            supportEmail: "support@slackdev.com",
            siteName: "Slack Dev",
            buttonText: "Verify Email",
            buttonUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
            logoUrl: `${process.env.BASE_URL || 'http://localhost:4000'}/logo.png`
        });
        (0, utils_1.sendMail)({
            subject: "Verify Email - Login Attempt",
            to: email,
            text,
            html,
            attachments: [{
                    filename: 'logo.png',
                    path: path_1.default.join(__dirname, '../public/logo.png'),
                    cid: 'logo'
                }]
        });
        // Return success response with email sent info
        res.status(200).json({
            message: "verification email sent",
            emailSent: true,
            user: formatUserResponse(user)
        });
        return;
    }
    const token = (0, middlewares_1.generateToken)({ id: user._id });
    res.status(200).json({
        message: "login successful",
        token,
        user: formatUserResponse(user)
    });
});
exports.verifyEmail = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { email, otp } = req.body;
    const user = await models_1.User.findOne({
        email,
        emailVerificationToken: otp,
        emailVerificationTokenExpires: { $gt: new Date() }
    });
    if (!user) {
        return res.status(400).json({ message: "invalid or expired verification code" });
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();
    res.status(200).json({ message: "email verified successfully" });
});
exports.resendOtp = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { email } = req.body;
    const user = await models_1.User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "user not found" });
    }
    if (user.emailVerified) {
        return res.status(400).json({ message: "email already verified" });
    }
    const emailVerificationToken = (0, utils_1.generateOtp)();
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpires = emailVerificationTokenExpires;
    await user.save();
    const { html, text } = (0, templates_1.buildOtpEmail)({
        otp: emailVerificationToken,
        username: user.username,
        supportEmail: "support@slackdev.com",
        siteName: "Slack Dev",
        buttonText: "Verify Email",
        buttonUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
        logoUrl: `${process.env.BASE_URL || 'http://localhost:4000'}/logo.png`
    });
    (0, utils_1.sendMail)({
        subject: "Verify Email - New Code",
        to: email,
        text,
        html,
        attachments: [{
                filename: 'logo.png',
                path: path_1.default.join(__dirname, '../public/logo.png'),
                cid: 'logo'
            }]
    });
    res.status(200).json({ message: "verification code resent to email" });
});
exports.forgotPassword = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { email } = req.body;
    const user = await models_1.User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "user not found" });
    }
    const resetToken = (0, utils_1.generateOtp)();
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = resetTokenExpires;
    await user.save();
    const { html, text } = (0, templates_1.buildResetPasswordEmail)({
        otp: resetToken,
        username: user.username,
        supportEmail: "support@slackdev.com",
        siteName: "Core Stack",
        buttonText: "Reset Password",
        buttonUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    });
    (0, utils_1.sendMail)({
        subject: "Reset Password",
        to: email,
        text,
        html,
        attachments: [{
                filename: 'logo.png',
                path: path_1.default.join(__dirname, '../public/logo.png'),
                cid: 'logo'
            }]
    });
    res.status(200).json({ message: "password reset code sent to email" });
});
exports.resetPassword = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const user = await models_1.User.findOne({
        email,
        passwordResetToken: otp,
        passwordResetTokenExpires: { $gt: new Date() }
    });
    if (!user) {
        return res.status(400).json({ message: "invalid or expired reset code" });
    }
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save();
    res.status(200).json({ message: "password reset successfully" });
});
exports.getProfile = (0, middlewares_1.catchAsync)(async (req, res) => {
    const user = req.user;
    res.status(200).json({
        user: formatUserResponse(user)
    });
});
