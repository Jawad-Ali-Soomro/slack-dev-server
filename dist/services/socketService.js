"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const helpers_1 = require("../helpers");
class SocketService {
    constructor(server) {
        this.connectedUsers = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:5173",
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.use(this.authenticateSocket.bind(this));
        this.io.on('connection', (socket) => {
            const user = socket.data.user;
            if (!user)
                return;
            this.connectedUsers.set(user.id, {
                userId: user.id,
                socketId: socket.id,
                isOnline: true,
                lastSeen: new Date()
            });
            helpers_1.logger.info(`User ${user.name} connected with socket ${socket.id}`);
            socket.join(`user:${user.id}`);
            socket.emit('connected', {
                message: 'Connected to chat server',
                userId: user.id
            });
            this.io.emit('user_online', {
                userId: user.id,
                isOnline: true,
                lastSeen: new Date()
            });
            socket.on('join_chat', (chatId) => {
                socket.join(`chat:${chatId}`);
                helpers_1.logger.info(`User ${user.id} joined chat ${chatId}`);
            });
            socket.on('leave_chat', (chatId) => {
                socket.leave(`chat:${chatId}`);
                helpers_1.logger.info(`User ${user.id} left chat ${chatId}`);
            });
            socket.on('typing_start', (data) => {
                socket.to(`chat:${data.chatId}`).emit('user_typing', {
                    userId: user.id,
                    userName: user.name,
                    chatId: data.chatId,
                    isTyping: true
                });
            });
            socket.on('typing_stop', (data) => {
                socket.to(`chat:${data.chatId}`).emit('user_typing', {
                    userId: user.id,
                    userName: user.name,
                    chatId: data.chatId,
                    isTyping: false
                });
            });
            socket.on('mark_as_read', (data) => {
                socket.to(`chat:${data.chatId}`).emit('message_read', {
                    userId: user.id,
                    messageId: data.messageId,
                    chatId: data.chatId,
                    readAt: new Date()
                });
            });
            // Code Collaboration Events
            socket.on('join_session', (data) => {
                socket.join(`session:${data.sessionId}`);
                helpers_1.logger.info(`User ${user.id} joined code session ${data.sessionId}`);
                socket.to(`session:${data.sessionId}`).emit('user_joined_session', {
                    sessionId: data.sessionId,
                    user: {
                        _id: user.id,
                        username: user.name,
                        email: user.email,
                        avatar: user.avatar
                    },
                    participantCount: 0 // Will be updated by the service
                });
            });
            socket.on('leave_session', (data) => {
                socket.leave(`session:${data.sessionId}`);
                helpers_1.logger.info(`User ${user.id} left code session ${data.sessionId}`);
                socket.to(`session:${data.sessionId}`).emit('user_left_session', {
                    sessionId: data.sessionId,
                    userId: user.id,
                    participantCount: 0 // Will be updated by the service
                });
            });
            socket.on('code_change', (data) => {
                socket.to(`session:${data.sessionId}`).emit('code_updated', {
                    sessionId: data.sessionId,
                    code: data.code,
                    updatedBy: user.id,
                    cursorPosition: data.cursorPosition
                });
                helpers_1.logger.info(`User ${user.id} updated code in session ${data.sessionId}`);
            });
            socket.on('cursor_move', (data) => {
                socket.to(`session:${data.sessionId}`).emit('cursor_updated', {
                    sessionId: data.sessionId,
                    userId: user.id,
                    cursorPosition: data.cursorPosition
                });
            });
            socket.on('user_typing_session', (data) => {
                socket.to(`session:${data.sessionId}`).emit('user_typing_session', {
                    sessionId: data.sessionId,
                    userId: user.id,
                    isTyping: data.isTyping
                });
            });
            socket.on('disconnect', () => {
                this.connectedUsers.delete(user.id);
                this.io.emit('user_offline', {
                    userId: user.id,
                    isOnline: false,
                    lastSeen: new Date()
                });
                helpers_1.logger.info(`User ${user.name} disconnected`);
            });
        });
    }
    async authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            helpers_1.logger.info('Socket authentication attempt:', {
                hasToken: !!token,
                authToken: !!socket.handshake.auth.token,
                headerToken: !!socket.handshake.headers.authorization
            });
            if (!token) {
                helpers_1.logger.error('Socket authentication failed: No token provided');
                return next(new Error('Authentication error: No token provided'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            helpers_1.logger.info('Token decoded successfully:', { userId: decoded.id });
            const user = await models_1.User.findById(decoded.id).select('username email avatar');
            if (!user) {
                helpers_1.logger.error('Socket authentication failed: User not found', { userId: decoded.id });
                return next(new Error('Authentication error: User not found'));
            }
            socket.data.user = {
                id: user._id.toString(),
                name: user.username,
                email: user.email,
                avatar: user.avatar
            };
            helpers_1.logger.info('Socket authentication successful:', { userId: user._id, username: user.username });
            next();
        }
        catch (error) {
            helpers_1.logger.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    }
    emitToUser(userId, event, data) {
        const user = this.connectedUsers.get(userId);
        if (user) {
            this.io.to(user.socketId).emit(event, data);
        }
    }
    emitToChat(chatId, event, data) {
        this.io.to(`chat:${chatId}`).emit(event, data);
    }
    emitToAll(event, data) {
        this.io.emit(event, data);
    }
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    getOnlineUsers() {
        return Array.from(this.connectedUsers.values());
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    emitNewMessage(chatId, message) {
        this.emitToChat(chatId, 'new_message', message);
    }
    emitMessageUpdate(chatId, message) {
        this.emitToChat(chatId, 'message_updated', message);
    }
    emitMessageDelete(chatId, messageId) {
        this.emitToChat(chatId, 'message_deleted', { messageId });
    }
    emitNotification(userId, notification) {
        this.emitToUser(userId, 'new_notification', notification);
    }
    emitChatUpdate(chatId, chat) {
        this.emitToChat(chatId, 'chat_updated', chat);
    }
    // Code Collaboration Methods
    emitToSession(sessionId, event, data) {
        this.io.to(`session:${sessionId}`).emit(event, data);
    }
    emitCodeUpdate(sessionId, code, updatedBy, cursorPosition) {
        this.emitToSession(sessionId, 'code_updated', {
            sessionId,
            code,
            updatedBy,
            cursorPosition
        });
    }
    emitCursorUpdate(sessionId, userId, cursorPosition) {
        this.emitToSession(sessionId, 'cursor_updated', {
            sessionId,
            userId,
            cursorPosition
        });
    }
    emitUserJoinedSession(sessionId, user, participantCount) {
        this.emitToSession(sessionId, 'user_joined_session', {
            sessionId,
            user,
            participantCount
        });
    }
    emitUserLeftSession(sessionId, userId, participantCount) {
        this.emitToSession(sessionId, 'user_left_session', {
            sessionId,
            userId,
            participantCount
        });
    }
    emitSessionEnded(sessionId, reason) {
        this.emitToSession(sessionId, 'session_ended', {
            sessionId,
            reason
        });
    }
    emitUserTypingSession(sessionId, userId, isTyping) {
        this.emitToSession(sessionId, 'user_typing_session', {
            sessionId,
            userId,
            isTyping
        });
    }
}
exports.default = SocketService;
