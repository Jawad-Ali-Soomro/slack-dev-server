import { Request, Response } from 'express';
import chatService from '../services/chatService';
import { logger } from '../helpers';
import { IChatRequest, CreateChatRequest, SendMessageRequest, UpdateMessageRequest } from '../interfaces';

class ChatController {
  async createChat(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const chatData: CreateChatRequest = req.body;
      const chat = await chatService.createChat(userId, chatData);

      res.status(201).json({
        success: true,
        message: 'Chat created successfully',
        data: chat
      });
    } catch (error: any) {
      logger.error('Error in createChat controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create chat'
      });
    }
  }

  async getUserChats(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const chats = await chatService.getUserChats(userId, page, limit);

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
    } catch (error: any) {
      logger.error('Error in getUserChats controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get chats'
      });
    }
  }

  async getChatMessages(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { chatId } = req.params;



      const messages = await chatService.getChatMessages(chatId, userId);

      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages,
        pagination: {
         
          total: messages.length
        }
      });
    } catch (error: any) {
      logger.error('Error in getChatMessages controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get messages'
      });
    }
  }

  async sendMessage(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)._id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const messageData: SendMessageRequest = req.body;
      const message = await chatService.sendMessage(userId, messageData);

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error: any) {
      logger.error('Error in sendMessage controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send message'
      });
    }
  }

  async updateMessage(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { messageId } = req.params;
      const updateData: UpdateMessageRequest = req.body;

      const message = await chatService.updateMessage(messageId, userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Message updated successfully',
        data: message
      });
    } catch (error: any) {
      logger.error('Error in updateMessage controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update message'
      });
    }
  }

  async deleteMessage(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { messageId } = req.params;

      await chatService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error in deleteMessage controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete message'
      });
    }
  }

  async markAsRead(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { chatId } = req.params;

      await chatService.markMessageAsRead(chatId, userId);

      res.status(200).json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error: any) {
      logger.error('Error in markAsRead controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to mark messages as read'
      });
    }
  }

  async getUnreadCount(req: IChatRequest, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?._id?.toString();
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const unreadCount = await chatService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        message: 'Unread count retrieved successfully',
        data: { unreadCount }
      });
    } catch (error: any) {
      logger.error('Error in getUnreadCount controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get unread count'
      });
    }
  }
}

export default new ChatController();
