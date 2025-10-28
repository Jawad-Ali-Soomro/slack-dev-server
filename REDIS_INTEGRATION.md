# Redis Integration Documentation

## Overview
Redis has been fully integrated into the Core Stack server to provide high-performance caching, session management, and data persistence.

## Features Implemented

### 1. Redis Service (`services/redis.service.ts`)
- Comprehensive Redis client wrapper with ioredis
- Generic cache methods (set, get, del, exists)
- Specialized caching methods for different entities:
  - Users
  - Tasks
  - Meetings
  - Projects
  - Teams
  - Notifications
  - Friends
  - Followers/Following
  - Dashboard data
- Pattern-based cache invalidation
- Health check and connection management

### 2. Redis Middleware (`middlewares/redisCache.ts`)
- Generic caching middleware
- Specialized middleware for different use cases:
  - `userCache` - User-specific caching
  - `dashboardCache` - Dashboard data caching
  - `searchCache` - Search results caching
- Cache invalidation helpers
- Configurable TTL and key generation

### 3. Controller Integration
All controllers have been updated with Redis caching:

#### User Controller
- User details caching
- User search caching
- Profile update cache invalidation
- Avatar upload/delete cache invalidation

#### Task Controller (Enhanced)
- Task list caching with filters
- Individual task caching
- Task creation/update cache invalidation
- Dashboard data invalidation

#### Meeting Controller (Enhanced)
- Meeting list caching with filters
- Individual meeting caching
- Meeting creation/update cache invalidation

#### Project Controller
- Project list caching with filters
- Individual project caching
- Project member management cache invalidation
- Project statistics caching

#### Team Controller
- Team list caching with filters
- Individual team caching
- Team member management cache invalidation

#### Friend Controller
- Friend list caching
- Friend request caching
- Friend stats caching
- Friend search caching

#### Follow Controller
- Followers/Following list caching
- Follow stats caching
- Follow/unfollow cache invalidation

#### Notification Controller
- Notification list caching with pagination
- Notification read status caching

### 4. Health Check Endpoints
- `/api/health/health` - General health check including Redis
- `/api/health/redis/stats` - Redis-specific statistics
- `/api/health/cache` - Cache management (clear cache)

### 5. Configuration
- Centralized Redis configuration (`config/redis.ts`)
- Environment variable support
- Connection pooling and retry logic
- Support for Redis Cluster and Sentinel

## Cache Strategy

### Cache Keys
- User data: `user:{userId}`
- User details: `user:{userId}:details`
- User tasks: `user:{userId}:tasks`
- User meetings: `user:{userId}:meetings`
- User projects: `user:{userId}:projects`
- User teams: `user:{userId}:teams`
- User friends: `user:{userId}:friends`
- User followers: `user:{userId}:followers`
- User following: `user:{userId}:following`
- Dashboard: `dashboard:{userId}`
- Search results: `search:{type}:{query}`
- Individual entities: `{type}:{id}`

### TTL (Time To Live)
- Default: 5 minutes (300 seconds)
- User data: 10 minutes (600 seconds)
- Dashboard: 5 minutes (300 seconds)
- Search results: 3 minutes (180 seconds)
- Friends: 30 minutes (1800 seconds)
- Tasks/Meetings/Projects/Teams: 5 minutes (300 seconds)
- Notifications: 5 minutes (300 seconds)

### Cache Invalidation
- Pattern-based invalidation for related data
- User data invalidation on profile updates
- Entity-specific invalidation on CRUD operations
- Cross-entity invalidation (e.g., project updates invalidate user project lists)

## Environment Variables

```env
# Redis Server Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# Redis Connection Options
REDIS_MAX_RETRIES_PER_REQUEST=3
REDIS_RETRY_DELAY_ON_FAILOVER=100
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
```

## Usage Examples

### Using Redis Middleware
```typescript
import { redisCache, userCache } from '../middlewares';

// Generic caching
router.get('/users', redisCache({ ttl: 300 }), getUsers);

// User-specific caching
router.get('/profile', userCache, getProfile);
```

### Manual Cache Management
```typescript
import redisService from '../services/redis.service';

// Cache data
await redisService.set('key', data, 300);

// Get cached data
const cached = await redisService.get('key');

// Invalidate cache
await redisService.del('key');

// Pattern-based invalidation
await redisService.invalidatePattern('user:*');
```

## Performance Benefits

1. **Reduced Database Load**: Frequently accessed data is served from Redis cache
2. **Faster Response Times**: Cache hits provide sub-millisecond response times
3. **Scalability**: Redis can handle high concurrent read operations
4. **Smart Invalidation**: Only invalidates related cache entries when data changes
5. **Memory Efficiency**: TTL ensures cache doesn't grow indefinitely

## Monitoring

- Health check endpoint: `GET /api/health/health`
- Redis stats: `GET /api/health/redis/stats`
- Cache management: `DELETE /api/health/cache?pattern=*`

## Best Practices

1. **Cache Key Naming**: Use consistent, hierarchical naming conventions
2. **TTL Management**: Set appropriate TTL based on data update frequency
3. **Cache Invalidation**: Always invalidate related cache entries on updates
4. **Error Handling**: Gracefully handle Redis connection failures
5. **Memory Management**: Monitor Redis memory usage and set appropriate limits

## Troubleshooting

### Common Issues
1. **Redis Connection Failed**: Check Redis server status and connection parameters
2. **Cache Miss**: Verify cache key generation and TTL settings
3. **Memory Issues**: Monitor Redis memory usage and adjust TTL or implement LRU eviction
4. **Performance**: Use Redis monitoring tools to identify bottlenecks

### Debug Commands
```bash
# Check Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys "*"
```

