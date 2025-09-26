import { Router } from 'express';
import chatController from '../controllers/chat.controller';
import { authenticate } from '../middlewares';

const router = Router();

router.use(authenticate);

router.post('/', chatController.createChat);
router.get('/', chatController.getUserChats);
router.get('/:chatId/messages', chatController.getChatMessages);
router.post('/messages', chatController.sendMessage);
router.put('/messages/:messageId', chatController.updateMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);
router.put('/:chatId/read', chatController.markAsRead);
router.get('/unread/count', chatController.getUnreadCount);

export default router;
