"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chatService_1 = __importDefault(require("../services/chatService"));
const helpers_1 = require("../helpers");
class ChatController {
    async createChat(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const chatData = req.body;
            const chat = await chatService_1.default.createChat(userId, chatData);
            res.status(201).json({
                success: true,
                message: 'Chat created successfully',
                data: chat
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in createChat controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create chat'
            });
        }
    }
    async getUserChats(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const chats = await chatService_1.default.getUserChats(userId, page, limit);
            res.status(200).json({
                success: true,
                message: 'Chats retrieved successfully',
                data: chats,
                pagination: {
                    page,
                    limit,
                    total: chats.length
                }
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in getUserChats controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get chats'
            });
        }
    }
    async getChatMessages(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { chatId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const messages = await chatService_1.default.getChatMessages(chatId, userId, page, limit);
            res.status(200).json({
                success: true,
                message: 'Messages retrieved successfully',
                data: messages,
                pagination: {
                    page,
                    limit,
                    total: messages.length
                }
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in getChatMessages controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get messages'
            });
        }
    }
    async sendMessage(req, res) {
        try {
            const userId = req.user._id;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const messageData = req.body;
            const message = await chatService_1.default.sendMessage(userId, messageData);
            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: message
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in sendMessage controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to send message'
            });
        }
    }
    async updateMessage(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { messageId } = req.params;
            const updateData = req.body;
            const message = await chatService_1.default.updateMessage(messageId, userId, updateData);
            res.status(200).json({
                success: true,
                message: 'Message updated successfully',
                data: message
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in updateMessage controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update message'
            });
        }
    }
    async deleteMessage(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { messageId } = req.params;
            await chatService_1.default.deleteMessage(messageId, userId);
            res.status(200).json({
                success: true,
                message: 'Message deleted successfully'
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in deleteMessage controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete message'
            });
        }
    }
    async markAsRead(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { chatId } = req.params;
            await chatService_1.default.markMessageAsRead(chatId, userId);
            res.status(200).json({
                success: true,
                message: 'Messages marked as read'
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in markAsRead controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to mark messages as read'
            });
        }
    }
    async getUnreadCount(req, res) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const unreadCount = await chatService_1.default.getUnreadCount(userId);
            res.status(200).json({
                success: true,
                message: 'Unread count retrieved successfully',
                data: { unreadCount }
            });
        }
        catch (error) {
            helpers_1.logger.error('Error in getUnreadCount controller:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get unread count'
            });
        }
    }
}
exports.default = new ChatController();
