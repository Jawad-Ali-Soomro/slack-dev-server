import Redis from 'ioredis';
import { logger } from '../helpers';
import { redisConfig } from '../config';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(redisConfig);

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
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        // Delete in batches to avoid blocking Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await this.client.del(...batch);
        }
        logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Error invalidating pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Comprehensive cache invalidation for projects
   * Invalidates all project-related caches for a user
   */
  async invalidateAllProjectCaches(userId: string | any): Promise<void> {
    const userIdStr = userId?.toString() || userId;
    try {
      // Invalidate user project list caches (all query variations)
      await this.invalidatePattern(`user:${userIdStr}:projects*`);
      
      // Invalidate user project cache
      await this.invalidateUserProjects(userIdStr);
      
      // Invalidate dashboard cache
      await this.invalidateDashboardData(userIdStr);
      
      // Invalidate user details cache (contains projects)
      await this.invalidatePattern(`user:${userIdStr}:details*`);
      await this.invalidatePattern(`cache:*user:${userIdStr}*`);
      
      logger.info(`Invalidated all project caches for user: ${userIdStr}`);
    } catch (error) {
      logger.error(`Error invalidating project caches for user ${userIdStr}:`, error);
    }
  }

  /**
   * Comprehensive cache invalidation for teams
   * Invalidates all team-related caches for a user
   */
  async invalidateAllTeamCaches(userId: string | any): Promise<void> {
    const userIdStr = userId?.toString() || userId;
    try {
      // Invalidate user team list caches (all query variations)
      await this.invalidatePattern(`user:${userIdStr}:teams*`);
      
      // Invalidate user team cache
      await this.invalidateUserTeams(userIdStr);
      
      // Invalidate dashboard cache
      await this.invalidateDashboardData(userIdStr);
      
      // Invalidate user details cache (contains teams)
      await this.invalidatePattern(`user:${userIdStr}:details*`);
      await this.invalidatePattern(`cache:*user:${userIdStr}*`);
      
      logger.info(`Invalidated all team caches for user: ${userIdStr}`);
    } catch (error) {
      logger.error(`Error invalidating team caches for user ${userIdStr}:`, error);
    }
  }

  // Notification cache methods
  async cacheUserNotifications(userId: string, notifications: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:notifications`, notifications, ttl);
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:notifications`) || [];
  }

  async invalidateUserNotifications(userId: string): Promise<void> {
    await this.del(`user:${userId}:notifications`);
  }

  async cacheNotification(notificationId: string, notificationData: any, ttl: number = 3600): Promise<void> {
    await this.set(`notification:${notificationId}`, notificationData, ttl);
  }

  async getNotification(notificationId: string): Promise<any> {
    return await this.get(`notification:${notificationId}`);
  }

  async invalidateNotification(notificationId: string): Promise<void> {
    await this.del(`notification:${notificationId}`);
  }

  // Project cache methods
  async cacheUserProjects(userId: string, projects: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:projects`, projects, ttl);
  }

  async getUserProjects(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:projects`) || [];
  }

  async invalidateUserProjects(userId: string): Promise<void> {
    await this.del(`user:${userId}:projects`);
  }

  async cacheProject(projectId: string, projectData: any, ttl: number = 3600): Promise<void> {
    await this.set(`project:${projectId}`, projectData, ttl);
  }

  async getProject(projectId: string): Promise<any> {
    return await this.get(`project:${projectId}`);
  }

  async invalidateProject(projectId: string): Promise<void> {
    await this.del(`project:${projectId}`);
  }

  // Team cache methods
  async cacheUserTeams(userId: string, teams: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:teams`, teams, ttl);
  }

  async getUserTeams(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:teams`) || [];
  }

  async invalidateUserTeams(userId: string): Promise<void> {
    await this.del(`user:${userId}:teams`);
  }

  async cacheTeam(teamId: string, teamData: any, ttl: number = 3600): Promise<void> {
    await this.set(`team:${teamId}`, teamData, ttl);
  }

  async getTeam(teamId: string): Promise<any> {
    return await this.get(`team:${teamId}`);
  }

  async invalidateTeam(teamId: string): Promise<void> {
    await this.del(`team:${teamId}`);
  }

  // Friend cache methods
  async invalidateFriendRequests(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:friendRequests:*`);
  }

  async invalidateFriendStats(userId: string): Promise<void> {
    await this.del(`user:${userId}:friendStats`);
  }

  // Friend cache methods
  async cacheUserFriends(userId: string, friends: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:friends`, friends, ttl);
  }

  async getUserFriends(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:friends`) || [];
  }

  async invalidateUserFriends(userId: string): Promise<void> {
    await this.del(`user:${userId}:friends`);
  }

  // Follow cache methods
  async cacheUserFollowers(userId: string, followers: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:followers`, followers, ttl);
  }

  async getUserFollowers(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:followers`) || [];
  }

  async invalidateUserFollowers(userId: string): Promise<void> {
    await this.del(`user:${userId}:followers`);
  }

  async cacheUserFollowing(userId: string, following: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:following`, following, ttl);
  }

  async getUserFollowing(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:following`) || [];
  }

  async invalidateUserFollowing(userId: string): Promise<void> {
    await this.del(`user:${userId}:following`);
  }

  // Rate limiting methods
  async increment(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis increment error:', error);
      throw error;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Redis decrement error:', error);
      throw error;
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL error:', error);
      return -1;
    }
  }

  // Set string value (for rate limiting)
  async setString(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis setString error:', error);
      throw error;
    }
  }

  // Get string value (for rate limiting)
  async getString(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis getString error:', error);
      return null;
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
