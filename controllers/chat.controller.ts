import { Response } from "express";
import chatService from "../services/chatService";
import { catchAsync } from "../middlewares/index";
import {
  IChatRequest,
  CreateChatRequest,
  SendMessageRequest,
  UpdateMessageRequest,
} from "../interfaces/index";

export const createChat = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const chatData: CreateChatRequest = req.body;
  const chat = await chatService.createChat(userId, chatData);

  res.status(201).json({
    success: true,
    message: "Chat created successfully",
    data: chat,
  });
});

export const getUserChats = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const chats = await chatService.getUserChats(userId, page, limit);

  res.status(200).json({
    success: true,
    message: "Chats retrieved successfully",
    data: chats,
    pagination: {
      page,
      limit,
      total: chats.length,
    },
  });
});

export const getChatMessages = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { chatId } = req.params;
  const messages = await chatService.getChatMessages(chatId, userId);

  res.status(200).json({
    success: true,
    message: "Messages retrieved successfully",
    data: messages,
    pagination: {
      total: messages.length,
    },
  });
});

export const sendMessage = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const messageData: SendMessageRequest = req.body;
  const message = await chatService.sendMessage(userId, messageData);

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: message,
  });
});

export const updateMessage = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { messageId } = req.params;
  const updateData: UpdateMessageRequest = req.body;

  const message = await chatService.updateMessage(messageId, userId, updateData);

  res.status(200).json({
    success: true,
    message: "Message updated successfully",
    data: message,
  });
});

export const deleteMessage = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { messageId } = req.params;
  await chatService.deleteMessage(messageId, userId);

  res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

export const markAsRead = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { chatId } = req.params;
  await chatService.markMessageAsRead(chatId, userId);

  res.status(200).json({
    success: true,
    message: "Messages marked as read",
  });
});

export const getUnreadCount = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const unreadCount = await chatService.getUnreadCount(userId);

  res.status(200).json({
    success: true,
    message: "Unread count retrieved successfully",
    data: { unreadCount },
  });
});
