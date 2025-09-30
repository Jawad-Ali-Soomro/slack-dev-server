"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const helpers_1 = require("../helpers");
const redis_service_1 = __importDefault(require("./redis.service"));
const mongoose_1 = __importDefault(require("mongoose"));
class ChatService {
    async createChat(userId, chatData) {
        try {
            const { participants, type, name, description } = chatData;
            const allParticipants = [...participants, userId];
            const uniqueParticipants = [...new Set(allParticipants)];
            if (type === 'direct' && uniqueParticipants.length !== 2) {
                throw new Error('Direct chat must have exactly 2 participants');
            }
            if (type === 'group' && uniqueParticipants.length < 2) {
                throw new Error('Group chat must have at least 2 participants');
            }
            const existingChat = await models_1.Chat.findOne({
                type: 'direct',
                participants: { $all: uniqueParticipants, $size: uniqueParticipants.length }
            }).populate('participants', 'username email avatar');
            if (existingChat) {
                return this.formatChatResponse(existingChat, userId);
            }
            const chat = new models_1.Chat({
                participants: uniqueParticipants,
                type,
                name: type === 'group' ? name : undefined,
                description: type === 'group' ? description : undefined,
                createdBy: userId
            });
            await chat.save();
            await chat.populate('participants', 'username email avatar');
            await redis_service_1.default.invalidateUserData(userId);
            for (const participantId of uniqueParticipants) {
                await redis_service_1.default.invalidateUserData(participantId);
            }
            return this.formatChatResponse(chat, userId);
        }
        catch (error) {
            helpers_1.logger.error('Error creating chat:', error);
            throw error;
        }
    }
    async getUserChats(userId, page = 1, limit = 20) {
        try {
            const cacheKey = `user:${userId}:chats:${page}:${limit}`;
            const cached = await redis_service_1.default.get(cacheKey);
            if (cached) {
                return cached;
            }
            const skip = (page - 1) * limit;
            const chats = await models_1.Chat.find({
                participants: userId,
                isActive: true
            })
                .populate('participants', 'username email avatar')
                .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'username email avatar'
                }
            })
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit);
            const chatResponses = await Promise.all(chats.map(chat => this.formatChatResponse(chat, userId)));
            await redis_service_1.default.set(cacheKey, chatResponses, 300);
            return chatResponses;
        }
        catch (error) {
            helpers_1.logger.error('Error getting user chats:', error);
            throw error;
        }
    }
    async getChatMessages(chatId, userId, page = 1, limit = 50) {
        try {
            const chat = await models_1.Chat.findOne({
                _id: chatId,
                participants: { $in: [userId] },
                isActive: true
            });
            if (!chat) {
                throw new Error('Chat not found or access denied');
            }
            const cacheKey = `chat:${chatId}:messages:${page}:${limit}`;
            const cached = await redis_service_1.default.get(cacheKey);
            if (cached) {
                return cached;
            }
            const skip = (page - 1) * limit;
            const messages = await models_1.Message.find({
                chat: chatId,
                isDeleted: false
            })
                .populate('sender', 'username email avatar')
                .populate('replyTo', 'content sender')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit);
            const messageResponses = messages.map(message => this.formatMessageResponse(message));
            await redis_service_1.default.set(cacheKey, messageResponses, 300);
            return messageResponses;
        }
        catch (error) {
            helpers_1.logger.error('Error getting chat messages:', error);
            throw error;
        }
    }
    async sendMessage(userId, messageData) {
        try {
            const { chatId, content, type = 'text', attachments, replyTo } = messageData;
            if (!chatId) {
                throw new Error('Chat ID is required');
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(chatId)) {
                throw new Error('Invalid chat ID format');
            }
            if (!content || !content.trim()) {
                throw new Error('Message content is required');
            }
            const chat = await models_1.Chat.findOne({
                _id: chatId,
                participants: userId,
                isActive: true
            }).populate('participants', '_id');
            if (!chat) {
                throw new Error('Chat not found or access denied');
            }
            const message = new models_1.Message({
                chat: chatId,
                sender: userId,
                content,
                type,
                attachments,
                replyTo
            });
            await message.save();
            await message.populate('sender', 'username email avatar');
            if (replyTo) {
                await message.populate('replyTo', 'content sender');
            }
            chat.lastMessage = message._id;
            chat.lastMessageAt = new Date();
            await chat.save();
            // Populate the participants and lastMessage for the response
            await chat.populate('participants', 'username email avatar');
            await chat.populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'username email avatar'
                }
            });
            await redis_service_1.default.invalidatePattern(`chat:${chatId}:messages:*`);
            await redis_service_1.default.invalidatePattern(`user:*:chats:*`);
            const messageResponse = this.formatMessageResponse(message);
            await this.createMessageNotifications(chat, message, userId);
            // Emit real-time events
            const socketService = global.socketService;
            if (socketService) {
                socketService.emitNewMessage(chatId, messageResponse);
                const chatResponse = this.formatChatResponse(chat, userId);
                console.log('Emitting chat update with participants:', chatResponse.participants);
                socketService.emitChatUpdate(chatId, chatResponse);
            }
            return messageResponse;
        }
        catch (error) {
            helpers_1.logger.error('Error sending message:', error);
            throw error;
        }
    }
    async updateMessage(messageId, userId, updateData) {
        try {
            const message = await models_1.Message.findOne({
                _id: messageId,
                sender: userId,
                isDeleted: false
            });
            if (!message) {
                throw new Error('Message not found or access denied');
            }
            message.content = updateData.content;
            message.isEdited = true;
            message.editedAt = new Date();
            await message.save();
            await message.populate('sender', 'username email avatar');
            if (message.replyTo) {
                await message.populate('replyTo', 'content sender');
            }
            await redis_service_1.default.invalidatePattern(`chat:${message.chat}:messages:*`);
            const messageResponse = this.formatMessageResponse(message);
            // Emit real-time events
            const socketService = global.socketService;
            if (socketService) {
                socketService.emitMessageUpdate(message.chat.toString(), messageResponse);
            }
            return messageResponse;
        }
        catch (error) {
            helpers_1.logger.error('Error updating message:', error);
            throw error;
        }
    }
    async deleteMessage(messageId, userId) {
        try {
            const message = await models_1.Message.findOne({
                _id: messageId,
                sender: userId,
                isDeleted: false
            });
            if (!message) {
                throw new Error('Message not found or access denied');
            }
            message.isDeleted = true;
            message.deletedAt = new Date();
            message.content = 'This message was deleted';
            await message.save();
            await redis_service_1.default.invalidatePattern(`chat:${message.chat}:messages:*`);
            // Emit real-time events
            const socketService = global.socketService;
            if (socketService) {
                socketService.emitMessageDelete(message.chat.toString(), messageId);
            }
        }
        catch (error) {
            helpers_1.logger.error('Error deleting message:', error);
            throw error;
        }
    }
    async markMessageAsRead(chatId, userId) {
        try {
            const chat = await models_1.Chat.findOne({
                _id: chatId,
                participants: { $in: [userId] },
                isActive: true
            });
            if (!chat) {
                throw new Error('Chat not found or access denied');
            }
            await models_1.Message.updateMany({
                chat: chatId,
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            }, {
                $push: {
                    readBy: {
                        user: userId,
                        readAt: new Date()
                    }
                }
            });
            await redis_service_1.default.invalidatePattern(`chat:${chatId}:messages:*`);
        }
        catch (error) {
            helpers_1.logger.error('Error marking messages as read:', error);
            throw error;
        }
    }
    async getUnreadCount(userId) {
        try {
            const unreadCount = await models_1.Message.countDocuments({
                chat: { $in: await this.getUserChatIds(userId) },
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            });
            return unreadCount;
        }
        catch (error) {
            helpers_1.logger.error('Error getting unread count:', error);
            return 0;
        }
    }
    async getUserChatIds(userId) {
        const chats = await models_1.Chat.find({
            participants: userId,
            isActive: true
        }).select('_id');
        return chats.map((chat) => chat._id.toString());
    }
    async createMessageNotifications(chat, message, senderId) {
        try {
            if (!chat.participants || !Array.isArray(chat.participants)) {
                helpers_1.logger.error('Invalid chat participants:', chat.participants);
                return;
            }
            const recipients = chat.participants
                .filter((participant) => {
                const participantId = participant._id ? participant._id.toString() : participant.toString();
                return participantId !== senderId;
            })
                .map((participant) => participant._id ? participant._id.toString() : participant.toString());
            helpers_1.logger.info('Creating notifications for recipients:', recipients);
            for (const recipientId of recipients) {
                if (!recipientId) {
                    helpers_1.logger.warn('Skipping undefined recipient ID');
                    continue;
                }
                const notification = new models_1.Notification({
                    recipient: recipientId,
                    sender: senderId,
                    type: 'message',
                    message: `New message in ${chat.type === 'direct' ? 'chat' : chat.name}`,
                    isRead: false
                });
                await notification.save();
            }
        }
        catch (error) {
            helpers_1.logger.error('Error creating message notifications:', error);
        }
    }
    formatChatResponse(chat, userId) {
        const otherParticipants = chat.participants.filter((p) => p._id.toString() !== userId);
        return {
            _id: chat._id.toString(),
            participants: chat.participants.map((p) => ({
                _id: p._id.toString(),
                username: p.username,
                name: p.username, // Use username as name for display
                email: p.email,
                avatar: p.avatar
            })),
            type: chat.type,
            name: chat.name,
            description: chat.description,
            lastMessage: chat.lastMessage ? {
                _id: chat.lastMessage._id.toString(),
                content: chat.lastMessage.content,
                sender: chat.lastMessage.sender ? {
                    _id: chat.lastMessage.sender._id.toString(),
                    username: chat.lastMessage.sender.username,
                    name: chat.lastMessage.sender.username,
                    email: chat.lastMessage.sender.email,
                    avatar: chat.lastMessage.sender.avatar
                } : chat.lastMessage.sender,
                createdAt: chat.lastMessage.createdAt
            } : undefined,
            lastMessageAt: chat.lastMessageAt,
            unreadCount: 0,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt
        };
    }
    formatMessageResponse(message) {
        return {
            _id: message._id.toString(),
            chat: message.chat.toString(),
            sender: {
                _id: message.sender._id.toString(),
                username: message.sender.username,
                name: message.sender.username,
                email: message.sender.email,
                avatar: message.sender.avatar
            },
            content: message.content,
            type: message.type,
            attachments: message.attachments,
            replyTo: message.replyTo ? {
                _id: message.replyTo._id.toString(),
                content: message.replyTo.content,
                sender: message.replyTo.sender.toString()
            } : undefined,
            isEdited: message.isEdited,
            editedAt: message.editedAt,
            isDeleted: message.isDeleted,
            readBy: message.readBy.map((read) => ({
                user: read.user.toString(),
                readAt: read.readAt
            })),
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
        };
    }
}
exports.default = new ChatService();
