import { Chat, Message, User } from '../models/index';
import { CreateChatRequest, UpdateGroupChatRequest, SendMessageRequest, UpdateMessageRequest, ChatResponse, MessageResponse } from '../interfaces/index';
import { deleteGroupLogo, isManagedLogoPublicId, isManagedLogoUrl } from './cloudinary.service';
import { logger } from '../helpers/index';
import redisService from './redis.service';
import { notifyUser } from '../utils/notify';
import { publishChatNotification } from './chatNotificationQueue';
import mongoose from 'mongoose';
import path from 'path';

class ChatService {
  async createChat(userId: string, chatData: CreateChatRequest): Promise<ChatResponse> {
    try {
      const { participants, type, name, description, logo, logoPublicId } = chatData;
      
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

      const groupLogo = this.resolveGroupLogo(type, logo, logoPublicId);

      const chat = new Chat({
        participants: uniqueParticipants,
        type,
        name: type === 'group' ? name : undefined,
        description: type === 'group' ? description : undefined,
        logo: groupLogo?.url,
        logoPublicId: groupLogo?.publicId,
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

  async updateGroupChat(userId: string, chatId: string, updates: UpdateGroupChatRequest): Promise<ChatResponse> {
    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      isActive: true,
      participants: userId,
    });

    if (!chat) {
      throw new Error('Chat not found or access denied');
    }

    if (chat.createdBy.toString() !== userId) {
      throw new Error('Only the group creator can edit this chat');
    }

    if (typeof updates.name === 'string') {
      const name = updates.name.trim();
      if (!name) {
        throw new Error('Group name is required');
      }
      chat.name = name.slice(0, 80);
    }

    if (typeof updates.description === 'string') {
      chat.description = updates.description.trim().slice(0, 300);
    }

    if (updates.logo === null) {
      await deleteGroupLogo(chat.logoPublicId);
      chat.set("logo", undefined);
      chat.set("logoPublicId", undefined);
    } else if (typeof updates.logo === 'string' && updates.logo && updates.logo !== chat.logo) {
      const nextLogo = this.resolveGroupLogo('group', updates.logo, updates.logoPublicId || undefined);
      if (!nextLogo) {
        throw new Error('Invalid group logo');
      }
      if (chat.logoPublicId && chat.logoPublicId !== nextLogo.publicId) {
        await deleteGroupLogo(chat.logoPublicId);
      }
      chat.logo = nextLogo.url;
      chat.logoPublicId = nextLogo.publicId;
    }

    await chat.save();
    await chat.populate('participants', 'username email avatar');

    for (const participant of chat.participants) {
      const participantId = participant._id?.toString?.() || String(participant);
      await redisService.invalidateUserData(participantId);
    }

    const formatted = this.formatChatResponse(chat, userId);
    const socketService = (global as any).socketService;
    if (socketService) {
      socketService.emitChatUpdate(String(chat._id), formatted);
    }

    return formatted;
  }

  async removeGroupMember(userId: string, chatId: string, memberId: string): Promise<ChatResponse> {
    const chat = await Chat.findOne({
      _id: chatId,
      type: 'group',
      isActive: true,
      participants: userId,
    });

    if (!chat) {
      throw new Error('Chat not found or access denied');
    }

    if (chat.createdBy.toString() !== userId) {
      throw new Error('Only the group creator can edit this chat');
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      throw new Error('Invalid member');
    }

    if (memberId === chat.createdBy.toString()) {
      throw new Error('The group admin cannot be removed');
    }

    const isMember = chat.participants.some((participant) => participant.toString() === memberId);
    if (!isMember) {
      throw new Error('That member is not in this group');
    }

    if (chat.participants.length <= 2) {
      throw new Error('A group needs at least two people');
    }

    chat.participants = chat.participants.filter(
      (participant) => participant.toString() !== memberId,
    ) as typeof chat.participants;

    await chat.save();
    await chat.populate('participants', 'username email avatar');

    await redisService.invalidateUserData(memberId);
    for (const participant of chat.participants) {
      const participantId = participant._id?.toString?.() || String(participant);
      await redisService.invalidateUserData(participantId);
    }

    const formatted = this.formatChatResponse(chat, userId);
    const socketService = (global as any).socketService;
    if (socketService) {
      socketService.emitChatUpdate(chatId, formatted);
      socketService.emitToUser(memberId, 'removed_from_chat', { chatId });
    }

    return formatted;
  }

  private resolveGroupLogo(type: string, logo?: string, logoPublicId?: string) {
    if (type !== 'group' || !logo) return null;
    if (!isManagedLogoUrl(logo) || !isManagedLogoPublicId(logoPublicId)) {
      throw new Error('Invalid group logo');
    }
    return { url: logo, publicId: logoPublicId as string };
  }

  async getUserChats(userId: string, page: number = 1, limit: number = 20): Promise<ChatResponse[]> {
    try {
      const cacheKey = `user:${userId}:chats:v2:${page}:${limit}`;
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
      const { chatId, type = 'text', replyTo } = messageData;
      const attachments = this.sanitizeAttachments(messageData.attachments);
      const content = (messageData.content || "").trim();


      if (!chatId) {
        throw new Error('Chat ID is required');
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error('Invalid chat ID format');
      }

      if (!content && attachments.length === 0) {
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
        content: content || this.attachmentCaption(attachments),
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

      const messageResponse = this.formatMessageResponse(message);
      const participantIds = (chat.participants || []).map((participant: any) =>
        (participant._id || participant).toString(),
      );

      const socketService = (global as any).socketService;
      if (socketService) {
        socketService.emitNewMessage(chatId, messageResponse, participantIds);
      }

      void this.deliverMessageSideEffects(
        chat,
        message,
        userId,
        chatId,
        participantIds,
      );

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
      message.attachments = [];

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

  private async deliverMessageSideEffects(
    chat: any,
    message: any,
    userId: string,
    chatId: string,
    participantIds: string[],
  ): Promise<void> {
    try {
      await chat.save();
      await Promise.all([
        redisService.del(`chat:${chatId}:messages:1:50`),
        ...participantIds.map((id) => redisService.del(`user:${id}:chats:v2:1:20`)),
      ]);
      await this.createMessageNotifications(chat, message, userId);

      const fresh = await Chat.findById(chatId)
        .populate('participants', 'username email avatar')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'username email avatar',
          },
        });

      const socketService = (global as any).socketService;
      if (fresh && socketService) {
        socketService.emitChatUpdate(chatId, this.formatChatResponse(fresh, userId));
      }
    } catch (error) {
      logger.error('Error finishing message delivery:', error);
    }
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
      
      const senderName = message.sender?.username || "Someone";
      const text = `${senderName} just messaged you`;

      await Promise.all(
        recipients.filter(Boolean).map(async (recipientId) => {
          const notification = await notifyUser({
            recipient: recipientId,
            sender: senderId,
            type: "message",
            message: text,
            skipEmit: true,
          });

          await publishChatNotification(recipientId, notification);
        }),
      );
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
      logo: chat.logo || undefined,
      createdBy: chat.createdBy?._id?.toString?.() || chat.createdBy?.toString?.(),
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

  private sanitizeAttachments(attachments?: SendMessageRequest["attachments"]) {
    if (!Array.isArray(attachments)) return [];

    return attachments
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const url = String(item.url || "");
        if (!url.startsWith("/uploads/chat/") || url.includes("..")) return null;
        return {
          url,
          name: String(item.name || path.basename(url)).slice(0, 180),
          mimetype: String(item.mimetype || "").slice(0, 120),
          size: Number(item.size) || 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 5);
  }

  private attachmentCaption(attachments: Array<{ name?: string }>) {
    if (attachments.length === 1) return attachments[0].name || "Sent a file";
    return `Sent ${attachments.length} files`;
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
