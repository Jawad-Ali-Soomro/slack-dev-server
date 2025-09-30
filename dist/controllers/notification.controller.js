"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const middlewares_1 = require("../middlewares");
const models_1 = require("../models");
const redis_service_1 = __importDefault(require("../services/redis.service"));
exports.getNotifications = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user._id;
    // Try to get from cache first
    const cacheKey = `user:${userId}:notifications:${page}:${limit}`;
    const cached = await redis_service_1.default.get(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }
    const notifications = await models_1.Notification.find({ recipient: userId })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    const total = await models_1.Notification.countDocuments({ recipient: userId });
    const response = {
        notifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    };
    // Cache the response for 5 minutes
    await redis_service_1.default.set(cacheKey, response, 300);
    res.status(200).json(response);
});
exports.markAsRead = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;
    const notification = await models_1.Notification.findOneAndUpdate({ _id: notificationId, recipient: userId }, { isRead: true }, { new: true });
    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }
    // Invalidate user notification caches
    await redis_service_1.default.invalidateUserNotifications(userId);
    await redis_service_1.default.invalidatePattern(`user:${userId}:notifications:*`);
    res.status(200).json({
        message: "Notification marked as read",
        notification
    });
});
exports.markAllAsRead = (0, middlewares_1.catchAsync)(async (req, res) => {
    const userId = req.user._id;
    await models_1.Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    // Invalidate user notification caches
    await redis_service_1.default.invalidateUserNotifications(userId);
    await redis_service_1.default.invalidatePattern(`user:${userId}:notifications:*`);
    res.status(200).json({ message: "All notifications marked as read" });
});
exports.deleteNotification = (0, middlewares_1.catchAsync)(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;
    const notification = await models_1.Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
    });
    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }
    res.status(200).json({ message: "Notification deleted successfully" });
});
