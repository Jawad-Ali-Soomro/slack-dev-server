import { Chat, Message, User, Notification } from '../models';
import { CreateChatRequest, SendMessageRequest, UpdateMessageRequest, ChatResponse, MessageResponse } from '../interfaces';
import { logger } from '../helpers';
import redisService from './redis.service';
import mongoose from 'mongoose';

class ChatService {
  async createChat(userId: string, chatData: CreateChatRequest): Promise<ChatResponse> {
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

      let existingChat = null;
      if (type === 'direct') {

        const participantObjectIds = uniqueParticipants.map(id => 
          typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
        
        existingChat = await Chat.findOne({
          type: 'direct',
          participants: { $all: participantObjectIds, $size: participantObjectIds.length }
        }).populate('participants', 'username email avatar');
        
        logger.info('Looking for existing chat with participants:', participantObjectIds);
        logger.info('Found existing chat:', existingChat ? existingChat._id : 'None');
      }

      if (existingChat) {
        return this.formatChatResponse(existingChat, userId);
      }

      const chat = new Chat({
        participants: uniqueParticipants,
        type,
        name: type === 'group' ? name : undefined,
        description: type === 'group' ? description : undefined,
        createdBy: userId
      });

      await chat.save();
      await chat.populate('participants', 'username email avatar');

      await redisService.invalidateUserData(userId);
      for (const participantId of uniqueParticipants) {
        await redisService.invalidateUserData(participantId);
      }

      return this.formatChatResponse(chat, userId);
    } catch (error) {
      logger.error('Error creating chat:', error);
      throw error;
    }
  }

  async getUserChats(userId: string, page: number = 1, limit: number = 20): Promise<ChatResponse[]> {
    try {
      const cacheKey = `user:${userId}:chats:${page}:${limit}`;
      const cached = await redisService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const skip = (page - 1) * limit;
      
      const chats = await Chat.find({
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

      const chatResponses = await Promise.all(
        chats.map(chat => this.formatChatResponse(chat, userId))
      );

      await redisService.set(cacheKey, chatResponses, 300);
      return chatResponses;
    } catch (error) {
      logger.error('Error getting user chats:', error);
      throw error;
    }
  }

  async getChatMessages(chatId: string, userId: string, page: number = 1, limit: number = 50): Promise<MessageResponse[]> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: { $in: [userId] },
        isActive: true
      });

      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      const cacheKey = `chat:${chatId}:messages:${page}:${limit}`;
      const cached = await redisService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      
      const messages = await Message.find({
        chat: chatId,
        isDeleted: false
      })
      .populate('sender', 'username email avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: 1 })



      const messageResponses = messages.map(message => this.formatMessageResponse(message));

      await redisService.set(cacheKey, messageResponses, 300);
      return messageResponses;
    } catch (error) {
      logger.error('Error getting chat messages:', error);
      throw error;
    }
  }

  async sendMessage(userId: string, messageData: SendMessageRequest): Promise<MessageResponse> {
    try {
      const { chatId, content, type = 'text', attachments, replyTo } = messageData;


      if (!chatId) {
        throw new Error('Chat ID is required');
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error('Invalid chat ID format');
      }

      if (!content || !content.trim()) {
        throw new Error('Message content is required');
      }

      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId,
        isActive: true
      }).populate('participants', '_id');

      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      const message = new Message({
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

      chat.lastMessage = message._id as any;
      chat.lastMessageAt = new Date();
      await chat.save();

      await chat.populate('participants', 'username email avatar');
      await chat.populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username email avatar'
        }
      });

      await redisService.invalidatePattern(`chat:${chatId}:messages:*`);
      await redisService.invalidatePattern(`user:*:chats:*`);

      const messageResponse = this.formatMessageResponse(message);


      await this.createMessageNotifications(chat, message, userId);

      const socketService = (global as any).socketService;
      if (socketService) {
        socketService.emitNewMessage(chatId, messageResponse);
        const chatResponse = this.formatChatResponse(chat, userId);
        socketService.emitChatUpdate(chatId, chatResponse);
      }

      return messageResponse;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  async updateMessage(messageId: string, userId: string, updateData: UpdateMessageRequest): Promise<MessageResponse> {
    try {
      const message = await Message.findOne({
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

      await redisService.invalidatePattern(`chat:${message.chat}:messages:*`);

      const messageResponse = this.formatMessageResponse(message);

      const socketService = (global as any).socketService;
      if (socketService) {
        socketService.emitMessageUpdate(message.chat.toString(), messageResponse);
      }

      return messageResponse;
    } catch (error) {
      logger.error('Error updating message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await Message.findOne({
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

      await redisService.invalidatePattern(`chat:${message.chat}:messages:*`);

      const socketService = (global as any).socketService;
      if (socketService) {
        socketService.emitMessageDelete(message.chat.toString(), messageId);
      }
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  async markMessageAsRead(chatId: string, userId: string): Promise<void> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: { $in: [userId] },
        isActive: true
      });

      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      await Message.updateMany(
        {
          chat: chatId,
          sender: { $ne: userId },
          'readBy.user': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date()
            }
          }
        }
      );

      await redisService.invalidatePattern(`chat:${chatId}:messages:*`);
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const unreadCount = await Message.countDocuments({
        chat: { $in: await this.getUserChatIds(userId) },
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      });

      return unreadCount;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  private async getUserChatIds(userId: string): Promise<string[]> {
    const chats = await Chat.find({
      participants: userId,
      isActive: true
    }).select('_id');
    
    return chats.map((chat: any) => chat._id.toString());
  }

  private async createMessageNotifications(chat: any, message: any, senderId: string): Promise<void> {
    try {
      if (!chat.participants || !Array.isArray(chat.participants)) {
        logger.error('Invalid chat participants:', chat.participants);
        return;
      }

      const recipients = chat.participants
        .filter((participant: any) => {
          const participantId = participant._id ? participant._id.toString() : participant.toString();
          return participantId !== senderId;
        })
        .map((participant: any) => participant._id ? participant._id.toString() : participant.toString());
      
      logger.info('Creating notifications for recipients:', recipients);
      
      for (const recipientId of recipients) {
        if (!recipientId) {
          logger.warn('Skipping undefined recipient ID');
          continue;
        }

        const notification = new Notification({
          recipient: recipientId,
          sender: senderId,
          type: 'message',
          message: `New message in ${chat.type === 'direct' ? 'chat' : chat.name}`,
          isRead: false
        });

        await notification.save();
      }
    } catch (error) {
      logger.error('Error creating message notifications:', error);
    }
  }

  private formatChatResponse(chat: any, userId: string): ChatResponse {
    const otherParticipants = chat.participants.filter((p: any) => p._id.toString() !== userId);
    
    return {
      _id: chat._id.toString(),
      participants: chat.participants.map((p: any) => ({
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

  private formatMessageResponse(message: any): MessageResponse {
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
      readBy: message.readBy.map((read: any) => ({
        user: read.user.toString(),
        readAt: read.readAt
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };
  }
}

export default new ChatService();
