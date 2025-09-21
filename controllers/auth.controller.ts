import { catchAsync, generateToken } from "../middlewares";
import jwt from "jsonwebtoken";
import { IUser, UserResponse } from "../interfaces";
import { User } from "../models";
import { generateOtp, sendMail } from "../utils";
import { buildOtpEmail, buildResetPasswordEmail } from "../templates";
import path from "path";

const formatUserResponse = (user: IUser): UserResponse => ({
  id: user._id,
  email: user.email,
  username: user.username,
  role: user.role,
  avatar: user.avatar,
  emailVerified: user.emailVerified,
  isPrivate: user.isPrivate,
});


export const register = catchAsync(async (req: any, res: any) => {
  const { email, username } = req.body;
  const findUserByEmail = await User.findOne({ email });
  if (findUserByEmail) {
    return res.status(400).json({ message: "email already in use" });
  }
  const findUserByUsername = await User.findOne({ username });
  if (findUserByUsername) {
    return res.status(400).json({ message: "username already taken" });
  }
  const emailVerificationToken = generateOtp();
  const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); 
  const { html, text } = buildOtpEmail({
    otp: emailVerificationToken,
    username: username,
    supportEmail: "support@slackdev.com",
    siteName: "Slack Dev",
    buttonText: "Verify Email",
    buttonUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
    logoUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/logo.png`
  })

  sendMail({
    subject: "Verify Email",
    to: email,
    text,
    html,
    attachments: [{
      filename: 'logo.png',
      path: path.join(__dirname, '../public/logo.png'),
      cid: 'logo'
    }]
  })
  try {
    const user = await User.create({
      ...req.body,
      emailVerificationToken,
      emailVerificationTokenExpires
    });
    const token = generateToken({ id: user._id });
    res.status(201).json({
      message: "user registered successfully",
      token,
      user: formatUserResponse(user)
    });
  } catch (err: any) {
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


export const login = catchAsync(async (req: any, res: any) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "invalid credentials" });
  }
  if (!user.emailVerified) {
    res.status(401).json({ message: "please verify your email first" });
    const emailVerificationToken = generateOtp();
    const { html, text } = buildOtpEmail({
      otp: emailVerificationToken,
      username: user.username,
      supportEmail: "support@slackdev.com",
      siteName: "Slack Dev",
      buttonText: "Verify Email",
      buttonUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
      logoUrl: `${process.env.BASE_URL || 'http://localhost:8080'}/logo.png`
    })
  
    sendMail({
      subject: "Verify Email",
      to: email,
      text,
      html,
      attachments: [{
        filename: 'logo.png',
        path: path.join(__dirname, '../public/logo.png'),
        cid: 'logo'
      }]
    })
    return;
  }
  const token = generateToken({ id: user._id });
  res.status(200).json({
    message: "login successful",
    token,
    user: formatUserResponse(user)
  });
});


export const verifyEmail = catchAsync(async (req: any, res: any) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ 
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

export const forgotPassword = catchAsync(async (req: any, res: any) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  const resetToken = generateOtp();
  const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpires = resetTokenExpires;
  await user.save();
  const { html, text } = buildResetPasswordEmail({
    otp: resetToken,
    username: user.username,
    supportEmail: "support@slackdev.com",
    siteName: "Core Stack",
    buttonText: "Reset Password",
    buttonUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
  });
  sendMail({
    subject: "Reset Password",
    to: email,
    text,
    html,
    attachments: [{
      filename: 'logo.png',
      path: path.join(__dirname, '../public/logo.png'),
      cid: 'logo'
    }]
  });
  res.status(200).json({ message: "password reset code sent to email" });
});

export const resetPassword = catchAsync(async (req: any, res: any) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ 
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

export const getProfile = catchAsync(async (req: any, res: any) => {
  const user = req.user;
  res.status(200).json({
    user: formatUserResponse(user)
  });
});

