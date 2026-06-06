import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as notifCtrl from '../controllers/notification.controller';

const router = Router();

router.get('/', authMiddleware, notifCtrl.getNotifications);
router.get('/unread-count', authMiddleware, notifCtrl.getUnreadCount);
router.get('/announcements', notifCtrl.getAnnouncements);
router.patch('/read-all', authMiddleware, notifCtrl.markAllRead);
router.patch('/batch-read', authMiddleware, notifCtrl.markBatchRead);
router.patch('/:id/read', authMiddleware, notifCtrl.markRead);
router.delete('/batch', authMiddleware, notifCtrl.deleteNotifications);
router.delete('/:id', authMiddleware, notifCtrl.deleteNotification);

export default router;
