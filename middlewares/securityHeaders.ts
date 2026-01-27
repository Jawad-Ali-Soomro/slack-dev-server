import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Protects backend responses with security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {

  res.removeHeader('X-Powered-By');

  res.setHeader('X-Frame-Options', 'DENY');

  res.setHeader('X-Content-Type-Options', 'nosniff');

  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://m.stripe.network " +
    "'sha256-3pRnM6RDgF14MWFkvx4uteJg4lut04LUeWOimQRHoI8=' " +
    "'sha256-e357n1PxCJ8d03/QCSKaHFmHF1JADyvSHdSfshxM494=' " +
    "'sha256-5DA+a07wxWmEka9IdoWjSPVHb17Cp5284/lJzfbl8KA=' " +
    "'sha256-/5Guo2nzv5n/w6ukZpOBZOtTJBJPSkJ6mhHpnBgm3Ls='; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.stripe.com https://m.stripe.network ws: wss:; " +
    "frame-src https://js.stripe.com https://hooks.stripe.com"
  );

  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  res.setHeader('Server', '');

  if (req.path.includes('/api/auth') || req.path.includes('/api/user')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Response sanitization middleware
 * Removes sensitive information from error responses
 */
export const sanitizeResponse = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function(data: any) {
    if (data && typeof data === 'object') {

      const sanitized = { ...data };

      if (process.env.NODE_ENV === 'production' && sanitized.stack) {
        delete sanitized.stack;
      }

      if (sanitized.error && typeof sanitized.error === 'object') {
        if (process.env.NODE_ENV === 'production') {
          delete sanitized.error.stack;
          delete sanitized.error.details;
        }
      }

      return originalJson(sanitized);
    }
    return originalJson(data);
  };

  res.send = function(data: any) {
    return originalSend(data);
  };

  next();
};

