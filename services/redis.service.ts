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

  async cacheUser(userId: string, userData: any, ttl: number = 3600): Promise<void> {
    await this.set(`user:${userId}`, userData, ttl);
  }

  async getUser(userId: string): Promise<any> {
    return await this.get(`user:${userId}`);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
  }

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

  async cacheDashboardData(userId: string, dashboardData: any, ttl: number = 900): Promise<void> {
    await this.set(`dashboard:${userId}`, dashboardData, ttl);
  }

  async getDashboardData(userId: string): Promise<any> {
    return await this.get(`dashboard:${userId}`);
  }

  async invalidateDashboardData(userId: string): Promise<void> {
    await this.del(`dashboard:${userId}`);
  }

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

      await this.invalidatePattern(`user:${userIdStr}:projects*`);

      await this.invalidateUserProjects(userIdStr);

      await this.invalidateDashboardData(userIdStr);

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

      await this.invalidatePattern(`user:${userIdStr}:teams*`);

      await this.invalidateUserTeams(userIdStr);

      await this.invalidateDashboardData(userIdStr);

      await this.invalidatePattern(`user:${userIdStr}:details*`);
      await this.invalidatePattern(`cache:*user:${userIdStr}*`);
      
      logger.info(`Invalidated all team caches for user: ${userIdStr}`);
    } catch (error) {
      logger.error(`Error invalidating team caches for user ${userIdStr}:`, error);
    }
  }

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

  async invalidateFriendRequests(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:friendRequests:*`);
  }

  async invalidateFriendStats(userId: string): Promise<void> {
    await this.del(`user:${userId}:friendStats`);
  }

  async cacheUserFriends(userId: string, friends: any[], ttl: number = 1800): Promise<void> {
    await this.set(`user:${userId}:friends`, friends, ttl);
  }

  async getUserFriends(userId: string): Promise<any[]> {
    return await this.get(`user:${userId}:friends`) || [];
  }

  async invalidateUserFriends(userId: string): Promise<void> {
    await this.del(`user:${userId}:friends`);
  }

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

  async getString(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis getString error:', error);
      return null;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.client.flushall();
      logger.warn('Redis FLUSHALL executed - entire cache cleared');
    } catch (error) {
      logger.error('Redis flushAll error:', error);
      throw error;
    }
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export default new RedisService();
