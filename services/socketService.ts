import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { logger } from '../helpers';
import { SocketUser } from '../interfaces';

class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      if (!user) return;

      this.connectedUsers.set(user.id, {
        userId: user.id,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date()
      });

      logger.info(`User ${user.name} connected with socket ${socket.id}`);

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

      socket.on('join_chat', (chatId: string) => {
        socket.join(`chat:${chatId}`);
        logger.info(`User ${user.id} joined chat ${chatId}`);
      });

      socket.on('leave_chat', (chatId: string) => {
        socket.leave(`chat:${chatId}`);
        logger.info(`User ${user.id} left chat ${chatId}`);
      });

      socket.on('typing_start', (data: { chatId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          userId: user.id,
          userName: user.name,
          chatId: data.chatId,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { chatId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          userId: user.id,
          userName: user.name,
          chatId: data.chatId,
          isTyping: false
        });
      });

      socket.on('mark_as_read', (data: { chatId: string, messageId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('message_read', {
          userId: user.id,
          messageId: data.messageId,
          chatId: data.chatId,
          readAt: new Date()
        });
      });

      socket.on('disconnect', () => {
        this.connectedUsers.delete(user.id);
        
        this.io.emit('user_offline', {
          userId: user.id,
          isOnline: false,
          lastSeen: new Date()
        });

        logger.info(`User ${user.name} disconnected`);
      });
    });
  }

  private async authenticateSocket(socket: any, next: any): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      const user = await User.findById(decoded.id).select('name email avatar');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
    }
  }

  public emitToChat(chatId: string, event: string, data: any): void {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  public emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getOnlineUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public emitNewMessage(chatId: string, message: any): void {
    this.emitToChat(chatId, 'new_message', message);
  }

  public emitMessageUpdate(chatId: string, message: any): void {
    this.emitToChat(chatId, 'message_updated', message);
  }

  public emitMessageDelete(chatId: string, messageId: string): void {
    this.emitToChat(chatId, 'message_deleted', { messageId });
  }

  public emitNotification(userId: string, notification: any): void {
    this.emitToUser(userId, 'new_notification', notification);
  }

  public emitChatUpdate(chatId: string, chat: any): void {
    this.emitToChat(chatId, 'chat_updated', chat);
  }
}

export default SocketService;
