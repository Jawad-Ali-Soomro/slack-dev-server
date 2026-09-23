import { catchAsync, generateToken, invalidateCachePattern } from "../middlewares/index";
import jwt from "jsonwebtoken";
import { IUser, UserResponse, Availability, JobRole } from "../interfaces/index";
import { User } from "../models/index";
import { generateOtp } from "../utils/index";
import { sendOtpEmail } from "../templates/index";
import dotenv from "dotenv";
import redisService from "../services/redis.service";
import axios from "axios";
import { decrypt, setAuthCookie, clearAuthCookie, readAuthToken } from "../middlewares/token";

dotenv.config({
  path: "../config/.env"
});

const formatUserResponse = (user: IUser): UserResponse => ({
  id: user._id,
  email: user.email,
  username: user.username,
  role: user.role,
  avatar: user.avatar,
  emailVerified: user.emailVerified,
  isPrivate: user.isPrivate,
  createdAt: user.createdAt,
  socialLinks: user?.socialLinks,
  availability: (user as any).availability || Availability.Available,
  jobRole: (user as any).jobRole || JobRole.Unassigned,
  statusMessage: (user as any).statusMessage
});


export const register = catchAsync(async (req: any, res: any) => {
  const { email, username } = req.body;

  const normalizedEmail = email?.toLowerCase().trim();
  const trimmedUsername = username?.trim();
  
  if (!normalizedEmail || !trimmedUsername) {
    return res.status(400).json({ message: "email and username are required" });
  }
  
  const findUserByEmail = await User.findOne({ email: normalizedEmail });
  if (findUserByEmail) {
    return res.status(400).json({ message: "email already in use" });
  }
  const emailVerificationToken = generateOtp();
  const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  sendOtpEmail({
    to: email,
    username: trimmedUsername,
    otp: emailVerificationToken,
    kind: "signup",
  }).catch((err) => console.error("Signup OTP email failed:", err));
  try {
    const userData = { ...req.body };
    if (!userData.role || userData.role !== 'user') {
      userData.role = 'user';
    }
    userData.email = normalizedEmail;
    userData.username = trimmedUsername;
    
    const user = await User.create({
      ...userData,
      emailVerificationToken,
      emailVerificationTokenExpires
    });

    await Promise.all([
      invalidateCachePattern('admin:users:*'),
      invalidateCachePattern('cache:*users*'),
      invalidateCachePattern('search:users:*')
    ]);
    const token = generateToken({ id: user._id });
    res.status(201).json({
      message: "user registered successfully",
      token,
      user: formatUserResponse(user)
    });
  } catch (err: any) {
    if (err.code === 11000) {
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

  const normalizedEmail = email?.toLowerCase().trim();
  const trimmedPassword = password?.trim();

  if (!normalizedEmail || !trimmedPassword) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await user.comparePassword(trimmedPassword))) {
    return res.status(401).json({ message: "invalid credentials" });
  }
  if (!user.emailVerified) {

    const emailVerificationToken = generateOtp();
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpires = emailVerificationTokenExpires;
    await user.save();

    sendOtpEmail({
      to: normalizedEmail,
      username: user.username,
      otp: emailVerificationToken,
      kind: "login",
    }).catch((err) => console.error("Login OTP email failed:", err));

    res.status(200).json({ 
      message: "verification email sent", 
      emailSent: true,
      user: formatUserResponse(user)
    });
    return;
  }
  const token = generateToken({ id: user._id });
  setAuthCookie(res, token);
  res.status(200).json({
    message: "login successful",
    user: formatUserResponse(user)
  });
});


export const verifyEmail = catchAsync(async (req: any, res: any) => {
  const { email, otp } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ message: "email and otp are required" });
  }
  const user = await User.findOne({ 
    email: normalizedEmail,
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

export const resendOtp = catchAsync(async (req: any, res: any) => {
  const { email } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) {
    return res.status(400).json({ message: "email is required" });
  }
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  
  if (user.emailVerified) {
    return res.status(400).json({ message: "email already verified" });
  }
  
  const emailVerificationToken = generateOtp();
  const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  user.emailVerificationToken = emailVerificationToken;
  user.emailVerificationTokenExpires = emailVerificationTokenExpires;
  await user.save();
  
  sendOtpEmail({
    to: normalizedEmail,
    username: user.username,
    otp: emailVerificationToken,
    kind: "resend",
  }).catch((err) => console.error("Resend OTP email failed:", err));
  
  res.status(200).json({ message: "verification code resent to email" });
});

export const forgotPassword = catchAsync(async (req: any, res: any) => {
  const { email } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) {
    return res.status(400).json({ message: "email is required" });
  }
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  const resetToken = generateOtp();
  const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpires = resetTokenExpires;
  await user.save();
  sendOtpEmail({
    to: normalizedEmail,
    username: user.username,
    otp: resetToken,
    kind: "reset",
  }).catch((err) => console.error("Reset password email failed:", err));
  res.status(200).json({ message: "password reset code sent to email" });
});

export const resetPassword = catchAsync(async (req: any, res: any) => {
  const { email, otp, newPassword } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail || !otp || !newPassword) {
    return res.status(400).json({ message: "email, otp, and newPassword are required" });
  }
  const user = await User.findOne({ 
    email: normalizedEmail,
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

export const logout = catchAsync(async (_req: any, res: any) => {
  await redisService.flushAll();
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: 'logout successful' });
});

export const proxyAssistant = catchAsync(async (req: any, res: any) => {
  const token = readAuthToken(req);
  if (!token) {
    return res.status(401).json({ message: "Sign in as admin" });
  }

  const agentUrl = process.env.AGENT_URL || "http://localhost:5055";
  try {
    const response = await axios.post(
      `${agentUrl}/ask`,
      { prompt: req.body?.prompt },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 45000,
        validateStatus: () => true,
      },
    );
    res.status(response.status).json(response.data);
  } catch {
    res.status(502).json({ message: "Assistant failed" });
  }
});

export const getProfile = catchAsync(async (req: any, res: any) => {
  const user = req.user;
  res.status(200).json({
    user: formatUserResponse(user)
  });
});

export const connectGithub = catchAsync(async (req: any, res: any) => {
  const { code, state } = req.query;

  if (!state) return res.status(400).send("Missing user info (state)");

  let decoded: any;
  try {
    const jwtToken = decrypt(state);
    decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'default_secret');
  } catch (err) {
    return res.status(401).send("Invalid or expired token in state");
  }

  const userId = decoded.id;

  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: "application/json" } }
  );

  const accessToken = tokenRes.data.access_token;

  const githubUser = (await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })).data;

  await User.findByIdAndUpdate(userId, {
    "socialLinks.github": {
      id: githubUser.id,
      username: githubUser.login,
      accessToken,
    },
  });

  res.redirect(process.env.PROD_DASH_URL);
});

export const generateUrl = catchAsync(async (req: any, res: any) => {
   const state = generateToken({ id: req.user.id }); 

  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo user&prompt=select_account&state=${state}`;

  res.json({ url: githubUrl });
})
