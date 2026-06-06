import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/messages.controller';
import { searchChatMessages, readAllMessages } from '../controllers/chat.controller';

const router = Router();
router.use(authMiddleware);

// Rate limit: 30 messages per minute per user
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => String(req.user?.userId || req.ip),
  message: { code: 429, message: '发送太频繁，请稍后再试', data: null },
});

// Rate limit: 20 typing pings per minute per user
const typingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.user?.userId || req.ip),
  message: { code: 429, message: '请求过于频繁', data: null },
});

router.get('/unread-count', ctrl.getUnreadCount);
router.get('/conversations', ctrl.getConversations);
router.get('/:userId', ctrl.getMessages);
router.post('/:userId', messageLimiter, ctrl.sendMessage);
router.post('/:userId/typing', typingLimiter, ctrl.setTyping);
router.get('/:userId/typing', ctrl.getTyping);
router.patch('/:id/read', ctrl.markMessageRead);
router.get('/search/all', searchChatMessages);
router.patch('/read/all', readAllMessages);

export default router;