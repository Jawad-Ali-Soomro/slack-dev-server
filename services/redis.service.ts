import Redis from 'ioredis';
import { logger } from '../helpers';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });
  }

  // Generic cache methods
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  // User cache methods
  async cacheUser(userId: string, userData: any, ttl: number = 3600): Promise<void> {
    await this.set(`user:${userId}`, userData, ttl);
  }

  async getUser(userId: string): Promise<any> {
    return await this.get(`user:${userId}`);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
  }

  // Task cache methods
  async cacheUserTasks(userId: string, tasks: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:tasks`, tasks, ttl);
  }

  async getUserTasks(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:tasks`) || [];
  }

  async invalidateUserTasks(userId: string): Promise<void> {
    await this.del(`user:${userId}:tasks`);
  }

  async cacheTask(taskId: string, taskData: any, ttl: number = 3600): Promise<void> {
    await this.set(`task:${taskId}`, taskData, ttl);
  }

  async getTask(taskId: string): Promise<any> {
    return await this.get(`task:${taskId}`);
  }

  async invalidateTask(taskId: string): Promise<void> {
    await this.del(`task:${taskId}`);
  }

  // Meeting cache methods
  async cacheUserMeetings(userId: string, meetings: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:meetings`, meetings, ttl);
  }

  async getUserMeetings(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:meetings`) || [];
  }

  async invalidateUserMeetings(userId: string): Promise<void> {
    await this.del(`user:${userId}:meetings`);
  }

  async cacheMeeting(meetingId: string, meetingData: any, ttl: number = 3600): Promise<void> {
    await this.set(`meeting:${meetingId}`, meetingData, ttl);
  }

  async getMeeting(meetingId: string): Promise<any> {
    return await this.get(`meeting:${meetingId}`);
  }

  async invalidateMeeting(meetingId: string): Promise<void> {
    await this.del(`meeting:${meetingId}`);
  }

  // Dashboard cache methods
  async cacheDashboardData(userId: string, dashboardData: any, ttl: number = 900): Promise<void> {
    await this.set(`dashboard:${userId}`, dashboardData, ttl);
  }

  async getDashboardData(userId: string): Promise<any> {
    return await this.get(`dashboard:${userId}`);
  }

  async invalidateDashboardData(userId: string): Promise<void> {
    await this.del(`dashboard:${userId}`);
  }

  // Pattern-based invalidation
  async invalidateUserData(userId: string): Promise<void> {
    const keys = await this.client.keys(`*${userId}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Health check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  // Close connection
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export default new RedisService();
