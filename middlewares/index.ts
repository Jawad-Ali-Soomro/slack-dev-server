import { catchAsync } from "./catchAsync";
import { upload } from "./upload";
import { generateToken, authenticate } from "./token";
import { 
  redisCache, 
  userCache, 
  dashboardCache, 
  searchCache, 
  invalidateUserCache, 
  invalidateCachePattern 
} from "./redisCache";
import {
  rateLimiter,
  generalRateLimiter,
  // authRateLimiter,
  strictRateLimiter
} from "./rateLimiter";
import {
  securityHeaders,
  sanitizeResponse
} from "./securityHeaders";
import {
  authorize,
  requireSuperadmin,
  requireAdmin,
  canManageTeam
} from "./authorize";

export { 
  catchAsync, 
  upload, 
  generateToken, 
  authenticate,
  redisCache, 
  userCache, 
  dashboardCache, 
  searchCache, 
  invalidateUserCache, 
  invalidateCachePattern,
  rateLimiter,
  generalRateLimiter,
  // authRateLimiter,
  strictRateLimiter,
  securityHeaders,
  sanitizeResponse,
  authorize,
  requireSuperadmin,
  requireAdmin,
  canManageTeam
}