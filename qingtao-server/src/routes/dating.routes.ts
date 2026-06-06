import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/dating.controller';
import * as msgCtrl from '../controllers/datingMessage.controller';
import * as dmCtrl from '../controllers/dailyMatch.controller';

const router = Router();
router.use(authMiddleware);

// Rate limit: 30 messages per minute
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => String(req.user?.userId || req.ip),
  message: { code: 429, message: '发送太频繁，请稍后再试', data: null },
});

const typingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.user?.userId || req.ip),
  message: { code: 429, message: '请求过于频繁', data: null },
});

// Request management — specific routes before parameterized
router.get('/requests', ctrl.getRequests);
router.patch('/requests/:requestId', ctrl.handleRequest);

// Profile & posts
router.get('/profile', ctrl.getProfile);
router.post('/profile', moderateBody(['nickname', 'bio']), ctrl.updateProfile);
router.get('/posts', ctrl.getPosts);
router.post('/posts', moderateBody(['content']), ctrl.createPost);
router.put('/posts/:postId', moderateBody(['content']), ctrl.updatePost);
router.delete('/posts/:postId', ctrl.deletePost);

// Follow & request (parameterized userId)
router.get('/following', ctrl.getFollowing);
router.post('/:userId/follow', ctrl.followUser);
router.delete('/:userId/follow', ctrl.unfollowUser);
router.post('/:userId/request', ctrl.sendRequest);
router.delete('/relationship/:userId', ctrl.breakRelationship);

// Dating messages
router.get('/conversations', msgCtrl.getConversations);
router.get('/messages/unread-count', msgCtrl.getUnreadCount);
router.get('/messages/:userId', msgCtrl.getMessages);
router.post('/messages/:userId', msgCtrl.sendMessage);
router.post('/messages/:userId/typing', msgCtrl.setTyping);
router.get('/messages/:userId/typing', msgCtrl.getTyping);

// Daily Match — 每日缘分
router.get('/daily-match', dmCtrl.getDailyMatch);
router.post('/daily-match/:id/reveal', dmCtrl.revealIdentity);

export default router;
