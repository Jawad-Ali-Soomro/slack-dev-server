import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Protects backend responses with security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header (exposes Express)
  res.removeHeader('X-Powered-By');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HSTS) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Don't expose server information
  res.setHeader('Server', '');

  // Prevent caching of sensitive data
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

  // Override res.json to sanitize responses
  res.json = function(data: any) {
    if (data && typeof data === 'object') {
      // Remove sensitive fields
      const sanitized = { ...data };
      
      // Remove stack traces in production
      if (process.env.NODE_ENV === 'production' && sanitized.stack) {
        delete sanitized.stack;
      }

      // Remove internal error details
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

  // Override res.send for consistency
  res.send = function(data: any) {
    return originalSend(data);
  };

  next();
};

