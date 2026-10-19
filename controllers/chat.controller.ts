import { Response } from "express";
import multer from "multer";
import chatService from "../services/chatService";
import { uploadGroupLogo } from "../services/cloudinary.service";
import { catchAsync } from "../middlewares/index";
import {
  IChatRequest,
  CreateChatRequest,
  UpdateGroupChatRequest,
  SendMessageRequest,
  UpdateMessageRequest,
} from "../interfaces/index";

const groupLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Logo must be a JPEG, PNG, WebP, or GIF image"));
      return;
    }
    cb(null, true);
  },
});

export const uploadGroupLogoFile = (req: any, res: Response, next: any) => {
  groupLogoUpload.single("logo")(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Logo must be 5MB or smaller"
        : error.message || "Logo upload failed";
    res.status(400).json({ success: false, message });
  });
};

const sendChatError = (res: Response, error: any, fallback: string) => {
  const message = error?.message || fallback;
  const status = /not found|access denied/i.test(message)
    ? 404
    : /only the group|required|invalid|not configured|cannot|at least|not in/i.test(message)
      ? 400
      : 500;
  return res.status(status).json({ success: false, message });
};

export const uploadGroupLogoHandler = catchAsync(async (req: any, res: Response) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ success: false, message: "No logo uploaded" });
  }

  try {
    const result = await uploadGroupLogo(req.file.buffer);
    res.status(201).json({
      success: true,
      message: "Group logo uploaded",
      data: {
        logo: result.secure_url,
        logoPublicId: result.public_id,
      },
    });
  } catch (error: any) {
    return sendChatError(res, error, "Logo upload failed");
  }
});

export const createChat = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const chatData: CreateChatRequest = req.body;
  try {
    const chat = await chatService.createChat(userId, chatData);
    res.status(201).json({
      success: true,
      message: "Chat created successfully",
      data: chat,
    });
  } catch (error: any) {
    return sendChatError(res, error, "Failed to create chat");
  }
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

export const updateGroupChat = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { chatId } = req.params;
  const updates: UpdateGroupChatRequest = req.body;
  try {
    const chat = await chatService.updateGroupChat(userId, chatId, updates);
    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: chat,
    });
  } catch (error: any) {
    return sendChatError(res, error, "Failed to update group");
  }
});

export const removeGroupMember = catchAsync(async (req: IChatRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { chatId, memberId } = req.params;
  try {
    const chat = await chatService.removeGroupMember(userId, chatId, memberId);
    res.status(200).json({
      success: true,
      message: "Member removed",
      data: chat,
    });
  } catch (error: any) {
    return sendChatError(res, error, "Failed to remove member");
  }
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
