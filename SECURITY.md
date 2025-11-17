# Security Features

This document outlines the security features implemented in the Core Stack server.

## 🔐 Double Encryption for Tokens

### Overview
Tokens are protected with **double encryption** to prevent unauthorized access and token tampering:

1. **First Layer**: JWT token generation with expiration
2. **Second Layer**: AES-256-CBC encryption of the JWT token

### Implementation
- **File**: `server/middlewares/token.ts`
- **Encryption Algorithm**: AES-256-CBC
- **Key Management**: Uses `ENCRYPTION_KEY` environment variable

### Environment Variables Required
```env
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-32-byte-hex-encryption-key  # Generate with: openssl rand -hex 32
```

### How It Works
1. **Token Generation** (`generateToken`):
   - Creates JWT token with user payload
   - Encrypts JWT token using AES-256-CBC
   - Returns encrypted token to client

2. **Token Verification** (`authenticate`):
   - Decrypts the encrypted token
   - Verifies JWT signature
   - Validates user existence
   - Attaches user to request

## 🛡️ DDoS Protection - Rate Limiting

### Overview
Redis-based rate limiting prevents DDoS attacks by limiting requests per time window.

### Rate Limiters Available

#### 1. General Rate Limiter
- **Limit**: 100 requests per 15 minutes
- **Applies to**: All API routes
- **Usage**: Applied globally in `server/index.ts`

#### 2. Authentication Rate Limiter
- **Limit**: 5 requests per 15 minutes
- **Applies to**: Login, register, password reset, etc.
- **Usage**: Applied to auth routes in `server/routes/auth.routes.ts`
- **Feature**: Skips successful requests (doesn't count successful logins)

#### 3. Strict Rate Limiter
- **Limit**: 10 requests per hour
- **Applies to**: Sensitive operations
- **Usage**: Can be applied to specific routes as needed

### Rate Limit Headers
Responses include rate limit information:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: When the limit resets (ISO timestamp)

### Rate Limit Response
When limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests, please try again later.",
  "retryAfter": 900,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

## 🔒 Security Headers

### Overview
All responses are protected with security headers to prevent common attacks.

### Headers Applied
- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME sniffing
- **X-XSS-Protection**: `1; mode=block` - Enables XSS protection
- **Strict-Transport-Security**: HSTS for HTTPS (production only)
- **Content-Security-Policy**: Restricts resource loading
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Restricts browser features
- **Server**: Removed (hides server information)

### Cache Control
Sensitive endpoints (auth, user data) have no-cache headers:
- `Cache-Control: no-store, no-cache, must-revalidate, private`
- `Pragma: no-cache`
- `Expires: 0`

## 🧹 Response Sanitization

### Overview
Error responses are sanitized to prevent information leakage.

### Features
- Removes stack traces in production
- Removes internal error details
- Standardizes error format
- Prevents sensitive data exposure

## 📝 Usage Examples

### Applying Rate Limiter to Custom Route
```typescript
import { strictRateLimiter } from '../middlewares';

router.post('/sensitive-operation', strictRateLimiter, controller);
```

### Custom Rate Limiter
```typescript
import { rateLimiter } from '../middlewares';

const customLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many requests'
});

router.post('/endpoint', customLimiter, controller);
```

## ⚙️ Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-secret-key-here

# Encryption Key (32 bytes hex)
ENCRYPTION_KEY=your-32-byte-hex-key-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Node Environment
NODE_ENV=production
```

### Generating Encryption Key
```bash
# Generate a secure 32-byte hex key
openssl rand -hex 32
```

## 🔍 Monitoring

### Rate Limit Monitoring
- Check Redis keys: `ratelimit:*`
- Monitor rate limit headers in responses
- Log rate limit violations in server logs

### Security Monitoring
- Monitor authentication failures
- Track token decryption errors
- Monitor rate limit violations

## 🚨 Best Practices

1. **Never commit secrets**: Keep `ENCRYPTION_KEY` and `JWT_SECRET` in environment variables
2. **Rotate keys regularly**: Change encryption keys periodically
3. **Monitor rate limits**: Watch for abuse patterns
4. **Use HTTPS in production**: Required for HSTS and secure token transmission
5. **Review logs**: Regularly check authentication and rate limit logs

## 📚 Related Files

- `server/middlewares/token.ts` - Token encryption/decryption
- `server/middlewares/rateLimiter.ts` - Rate limiting
- `server/middlewares/securityHeaders.ts` - Security headers
- `server/services/redis.service.ts` - Redis service (rate limiting backend)
- `server/index.ts` - Middleware application
- `server/routes/auth.routes.ts` - Auth rate limiting example

