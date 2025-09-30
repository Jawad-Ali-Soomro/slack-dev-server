"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const helpers_1 = require("../helpers");
class RedisService {
    constructor() {
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        this.client.on('connect', () => {
            helpers_1.logger.info('Redis connected successfully');
        });
        this.client.on('error', (error) => {
            helpers_1.logger.error('Redis connection error:', error);
        });
    }
    // Generic cache methods
    async set(key, value, ttl) {
        try {
            const serializedValue = JSON.stringify(value);
            if (ttl) {
                await this.client.setex(key, ttl, serializedValue);
            }
            else {
                await this.client.set(key, serializedValue);
            }
        }
        catch (error) {
            helpers_1.logger.error('Redis set error:', error);
            throw error;
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            helpers_1.logger.error('Redis get error:', error);
            return null;
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            helpers_1.logger.error('Redis delete error:', error);
            throw error;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            helpers_1.logger.error('Redis exists error:', error);
            return false;
        }
    }
    // User cache methods
    async cacheUser(userId, userData, ttl = 3600) {
        await this.set(`user:${userId}`, userData, ttl);
    }
    async getUser(userId) {
        return await this.get(`user:${userId}`);
    }
    async invalidateUser(userId) {
        await this.del(`user:${userId}`);
    }
    // Task cache methods
    async cacheUserTasks(userId, tasks, ttl = 1800) {
        await this.set(`user:${userId}:tasks`, tasks, ttl);
    }
    async getUserTasks(userId) {
        return await this.get(`user:${userId}:tasks`) || [];
    }
    async invalidateUserTasks(userId) {
        await this.del(`user:${userId}:tasks`);
    }
    async cacheTask(taskId, taskData, ttl = 3600) {
        await this.set(`task:${taskId}`, taskData, ttl);
    }
    async getTask(taskId) {
        return await this.get(`task:${taskId}`);
    }
    async invalidateTask(taskId) {
        await this.del(`task:${taskId}`);
    }
    // Meeting cache methods
    async cacheUserMeetings(userId, meetings, ttl = 1800) {
        await this.set(`user:${userId}:meetings`, meetings, ttl);
    }
    async getUserMeetings(userId) {
        return await this.get(`user:${userId}:meetings`) || [];
    }
    async invalidateUserMeetings(userId) {
        await this.del(`user:${userId}:meetings`);
    }
    async cacheMeeting(meetingId, meetingData, ttl = 3600) {
        await this.set(`meeting:${meetingId}`, meetingData, ttl);
    }
    async getMeeting(meetingId) {
        return await this.get(`meeting:${meetingId}`);
    }
    async invalidateMeeting(meetingId) {
        await this.del(`meeting:${meetingId}`);
    }
    // Dashboard cache methods
    async cacheDashboardData(userId, dashboardData, ttl = 900) {
        await this.set(`dashboard:${userId}`, dashboardData, ttl);
    }
    async getDashboardData(userId) {
        return await this.get(`dashboard:${userId}`);
    }
    async invalidateDashboardData(userId) {
        await this.del(`dashboard:${userId}`);
    }
    // Pattern-based invalidation
    async invalidateUserData(userId) {
        const keys = await this.client.keys(`*${userId}*`);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }
    async invalidatePattern(pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }
    // Notification cache methods
    async cacheUserNotifications(userId, notifications, ttl = 1800) {
        await this.set(`user:${userId}:notifications`, notifications, ttl);
    }
    async getUserNotifications(userId) {
        return await this.get(`user:${userId}:notifications`) || [];
    }
    async invalidateUserNotifications(userId) {
        await this.del(`user:${userId}:notifications`);
    }
    async cacheNotification(notificationId, notificationData, ttl = 3600) {
        await this.set(`notification:${notificationId}`, notificationData, ttl);
    }
    async getNotification(notificationId) {
        return await this.get(`notification:${notificationId}`);
    }
    async invalidateNotification(notificationId) {
        await this.del(`notification:${notificationId}`);
    }
    // Project cache methods
    async cacheUserProjects(userId, projects, ttl = 1800) {
        await this.set(`user:${userId}:projects`, projects, ttl);
    }
    async getUserProjects(userId) {
        return await this.get(`user:${userId}:projects`) || [];
    }
    async invalidateUserProjects(userId) {
        await this.del(`user:${userId}:projects`);
    }
    async cacheProject(projectId, projectData, ttl = 3600) {
        await this.set(`project:${projectId}`, projectData, ttl);
    }
    async getProject(projectId) {
        return await this.get(`project:${projectId}`);
    }
    async invalidateProject(projectId) {
        await this.del(`project:${projectId}`);
    }
    // Team cache methods
    async cacheUserTeams(userId, teams, ttl = 1800) {
        await this.set(`user:${userId}:teams`, teams, ttl);
    }
    async getUserTeams(userId) {
        return await this.get(`user:${userId}:teams`) || [];
    }
    async invalidateUserTeams(userId) {
        await this.del(`user:${userId}:teams`);
    }
    async cacheTeam(teamId, teamData, ttl = 3600) {
        await this.set(`team:${teamId}`, teamData, ttl);
    }
    async getTeam(teamId) {
        return await this.get(`team:${teamId}`);
    }
    async invalidateTeam(teamId) {
        await this.del(`team:${teamId}`);
    }
    // Friend cache methods
    async cacheUserFriends(userId, friends, ttl = 1800) {
        await this.set(`user:${userId}:friends`, friends, ttl);
    }
    async getUserFriends(userId) {
        return await this.get(`user:${userId}:friends`) || [];
    }
    async invalidateUserFriends(userId) {
        await this.del(`user:${userId}:friends`);
    }
    // Follow cache methods
    async cacheUserFollowers(userId, followers, ttl = 1800) {
        await this.set(`user:${userId}:followers`, followers, ttl);
    }
    async getUserFollowers(userId) {
        return await this.get(`user:${userId}:followers`) || [];
    }
    async invalidateUserFollowers(userId) {
        await this.del(`user:${userId}:followers`);
    }
    async cacheUserFollowing(userId, following, ttl = 1800) {
        await this.set(`user:${userId}:following`, following, ttl);
    }
    async getUserFollowing(userId) {
        return await this.get(`user:${userId}:following`) || [];
    }
    async invalidateUserFollowing(userId) {
        await this.del(`user:${userId}:following`);
    }
    // Health check
    async ping() {
        return await this.client.ping();
    }
    // Close connection
    async disconnect() {
        await this.client.quit();
    }
}
exports.default = new RedisService();
