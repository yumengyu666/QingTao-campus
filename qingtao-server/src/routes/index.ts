import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import goodsRoutes from './goods.routes';
import cartRoutes from './cart.routes';
import favoriteRoutes from './favorite.routes';
import postRoutes from './post.routes';
import lostfoundRoutes from './lostfound.routes';
import notificationRoutes from './notification.routes';
import uploadRoutes from './upload.routes';
import searchRoutes from './search.routes';
import categoryRoutes from './category.routes';
import adminRoutes from './admin.routes';
import messagesRoutes from './messages.routes';
import datingRoutes from './dating.routes';
import qaRoutes from './qa.routes';
import blockRoutes from './block.routes';
import treeholeRoutes from './treehole.routes';
import courseResourceRoutes from './courseResource.routes';
import draftRoutes from './draft.routes';
import tradeRoutes from './trade.routes';
import { authMiddleware } from '../middleware/auth';
import { submitReport, submitAppeal, batchReview, getAuditLogs, exportCSV } from '../controllers/admin.controller';
import { getBanners } from '../controllers/banner.controller';
import { generateCaptcha } from '../controllers/captcha.controller';
import { checkStatus, batchImageReview, getReviewStats } from '../controllers/images.controller';
import { reportMessages } from '../controllers/report.controller';
import * as statsCtrl from '../controllers/stats.controller';
import { sseNotifications } from '../controllers/sse.controller';
import { exportMyData, getActivity } from '../controllers/data.controller';
import { agentChat, agentChatStream, clearConversation } from '../controllers/agent.controller';

const router = Router();

// SSE 实时推送（不需要 authMiddleware，token 通过 query 传递）
router.get('/sse/notifications', sseNotifications);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/goods', goodsRoutes);
router.use('/cart', cartRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/posts', postRoutes);
router.use('/lostfound', lostfoundRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/search', searchRoutes);
router.use('/categories', categoryRoutes);
router.use('/drafts', draftRoutes);
router.use('/admin', adminRoutes);
router.use('/messages', messagesRoutes);
router.use('/dating', datingRoutes);
router.use('/qa', qaRoutes);
router.use('/block', blockRoutes);
router.use('/treehole', treeholeRoutes);
router.use('/resources', courseResourceRoutes);
router.use('/trades', tradeRoutes);

router.get('/banners', getBanners);
router.get('/captcha/generate', generateCaptcha);

// Stats — public
router.get('/stats/leaderboard', statsCtrl.getLeaderboard);
router.get('/stats/summary', statsCtrl.getSummary);

// Report — auth required but not admin
router.post('/reports', authMiddleware, submitReport);
router.post('/reports/appeal', authMiddleware, submitAppeal);
router.post('/reports/messages', authMiddleware, reportMessages);
router.post('/admin/content/batch', authMiddleware, batchReview);
router.get('/admin/audit-logs', authMiddleware, getAuditLogs);
router.get('/admin/export/:type', authMiddleware, exportCSV);

// Image status check — any logged-in user
router.get('/images/status', authMiddleware, checkStatus);

// Image batch review — admin only
router.post('/admin/images/batch', authMiddleware, batchImageReview);
router.get('/admin/stats/review', authMiddleware, getReviewStats);

// Agent chat — 智能助手小轻 (auth required)
router.post('/agent/chat', authMiddleware, agentChat);
router.post('/agent/chat/stream', authMiddleware, agentChatStream);
router.post('/agent/chat/clear', authMiddleware, clearConversation);

// Sensitive word management
import { getSensitiveWords, addSensitiveWord, updateSensitiveWord, deleteSensitiveWord } from '../controllers/admin.controller';
router.get('/admin/sensitive-words', authMiddleware, getSensitiveWords);
router.post('/admin/sensitive-words', authMiddleware, addSensitiveWord);
router.put('/admin/sensitive-words/:id', authMiddleware, updateSensitiveWord);
router.delete('/admin/sensitive-words/:id', authMiddleware, deleteSensitiveWord);

export default router;
