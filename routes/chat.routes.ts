import express from "express";
import {
  createChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
  updateGroupChat,
  removeGroupMember,
  uploadGroupLogoFile,
  uploadGroupLogoHandler,
} from "../controllers/chat.controller";
import {
  uploadChatMultiple,
  uploadChatSingle,
  uploadMultipleChatFiles,
  uploadSingleChatFile,
} from "../controllers/chat-upload.controller";
import { authenticate } from "../middlewares/index";
const chatRouter = express.Router();

// global authentication middleware
chatRouter.use(authenticate);

chatRouter.post("/upload/single", uploadChatSingle, uploadSingleChatFile);
chatRouter.post("/upload/multiple", uploadChatMultiple, uploadMultipleChatFiles);
chatRouter.post("/groups/logo", uploadGroupLogoFile, uploadGroupLogoHandler);

chatRouter.post("/", createChat);
chatRouter.get("/", getUserChats);
chatRouter.get("/unread/count", getUnreadCount);
chatRouter.get("/:chatId/messages", getChatMessages);
chatRouter.post("/messages", sendMessage);
chatRouter.put("/messages/:messageId", updateMessage);
chatRouter.delete("/messages/:messageId", deleteMessage);
chatRouter.put("/:chatId/read", markAsRead);
chatRouter.delete("/:chatId/members/:memberId", removeGroupMember);
chatRouter.put("/:chatId", updateGroupChat);

export default chatRouter;
