"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = __importDefault(require("../controllers/chat.controller"));
const middlewares_1 = require("../middlewares");
const router = (0, express_1.Router)();
router.use(middlewares_1.authenticate);
router.post('/', chat_controller_1.default.createChat);
router.get('/', chat_controller_1.default.getUserChats);
router.get('/:chatId/messages', chat_controller_1.default.getChatMessages);
router.post('/messages', chat_controller_1.default.sendMessage);
router.put('/messages/:messageId', chat_controller_1.default.updateMessage);
router.delete('/messages/:messageId', chat_controller_1.default.deleteMessage);
router.put('/:chatId/read', chat_controller_1.default.markAsRead);
router.get('/unread/count', chat_controller_1.default.getUnreadCount);
exports.default = router;
