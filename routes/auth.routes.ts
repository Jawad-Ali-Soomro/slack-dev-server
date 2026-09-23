import express from 'express'
const authRouter = express.Router()
import { register, login, verifyEmail, resendOtp, forgotPassword, resetPassword, getProfile, logout, connectGithub, generateUrl, proxyAssistant } from '../controllers/auth.controller'
import { authenticate, authRateLimiter } from '../middlewares/index'

authRouter.post('/register', authRateLimiter, register)
authRouter.post('/login', authRateLimiter, login)
authRouter.post('/verify-email', authRateLimiter, verifyEmail)
authRouter.post('/resend-otp', authRateLimiter, resendOtp)
authRouter.post('/forgot-password', authRateLimiter, forgotPassword)
authRouter.post('/reset-password', authRateLimiter, resetPassword)
authRouter.get('/profile', authenticate, getProfile)
authRouter.post('/logout', authenticate, authRateLimiter, logout)
authRouter.get("/github/url", authenticate, generateUrl)
authRouter.post("/assistant/ask", authenticate, proxyAssistant)
authRouter.get("/github/callback", connectGithub)

export default authRouter