import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { logger } from '../helpers';
import { SocketUser } from '../interfaces';
import { decrypt } from '../middlewares/token';

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

      socket.on('join_session', (data: { sessionId: string }) => {
        socket.join(`session:${data.sessionId}`);
        logger.info(`User ${user.id} joined code session ${data.sessionId}`);
        
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

      socket.on('leave_session', (data: { sessionId: string }) => {
        socket.leave(`session:${data.sessionId}`);
        logger.info(`User ${user.id} left code session ${data.sessionId}`);
        
        socket.to(`session:${data.sessionId}`).emit('user_left_session', {
          sessionId: data.sessionId,
          userId: user.id,
          participantCount: 0 // Will be updated by the service
        });
      });

      socket.on('code_change', (data: { sessionId: string; code: string; cursorPosition?: { line: number; column: number } }) => {
        socket.to(`session:${data.sessionId}`).emit('code_updated', {
          sessionId: data.sessionId,
          code: data.code,
          updatedBy: user.id,
          cursorPosition: data.cursorPosition
        });
        logger.info(`User ${user.id} updated code in session ${data.sessionId}`);
      });

      socket.on('cursor_move', (data: { sessionId: string; cursorPosition: { line: number; column: number } }) => {
        socket.to(`session:${data.sessionId}`).emit('cursor_updated', {
          sessionId: data.sessionId,
          userId: user.id,
          cursorPosition: data.cursorPosition
        });
      });

      socket.on('user_typing_session', (data: { sessionId: string; isTyping: boolean }) => {
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

        logger.info(`User ${user.name} disconnected`);
      });
    });
  }

  private async authenticateSocket(socket: any, next: any): Promise<void> {
    try {
      const encryptedToken = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      logger.info('Socket authentication attempt:', {
        hasToken: !!encryptedToken,
        authToken: !!socket.handshake.auth.token,
        headerToken: !!socket.handshake.headers.authorization
      });
      
      if (!encryptedToken) {
        logger.error('Socket authentication failed: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      let jwtToken: string = encryptedToken;
      try {
        jwtToken = decrypt(encryptedToken);
      } catch (decryptError) {
        logger.warn('Socket token decryption failed, attempting raw token verification:', decryptError);

      }

      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'default_secret') as any;
      logger.info('Token decoded successfully:', { userId: decoded.id });

      const user = await User.findById(decoded.id).select('username email avatar');
      
      if (!user) {
        logger.error('Socket authentication failed: User not found', { userId: decoded.id });
        return next(new Error('Authentication error: User not found'));
      }

      socket.data.user = {
        id: user._id.toString(),
        name: user.username,
        email: user.email,
        avatar: user.avatar
      };
      
      logger.info('Socket authentication successful:', { userId: user._id, username: user.username });
      next();
    } catch (error: any) {
      logger.error('Socket authentication error:', error);

      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      }
      
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      return next(new Error('Authentication error: Invalid token'));
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

  public emitToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  public emitCodeUpdate(sessionId: string, code: string, updatedBy: string, cursorPosition?: { line: number; column: number }): void {
    this.emitToSession(sessionId, 'code_updated', {
      sessionId,
      code,
      updatedBy,
      cursorPosition
    });
  }

  public emitCursorUpdate(sessionId: string, userId: string, cursorPosition: { line: number; column: number }): void {
    this.emitToSession(sessionId, 'cursor_updated', {
      sessionId,
      userId,
      cursorPosition
    });
  }

  public emitUserJoinedSession(sessionId: string, user: any, participantCount: number): void {
    this.emitToSession(sessionId, 'user_joined_session', {
      sessionId,
      user,
      participantCount
    });
  }

  public emitUserLeftSession(sessionId: string, userId: string, participantCount: number): void {
    this.emitToSession(sessionId, 'user_left_session', {
      sessionId,
      userId,
      participantCount
    });
  }

  public emitSessionEnded(sessionId: string, reason: string): void {
    this.emitToSession(sessionId, 'session_ended', {
      sessionId,
      reason
    });
  }

  public emitUserTypingSession(sessionId: string, userId: string, isTyping: boolean): void {
    this.emitToSession(sessionId, 'user_typing_session', {
      sessionId,
      userId,
      isTyping
    });
  }
}

export default SocketService;
