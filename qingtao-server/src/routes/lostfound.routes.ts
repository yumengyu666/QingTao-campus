import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as lfCtrl from '../controllers/lostfound.controller';

const router = Router();

router.get('/', lfCtrl.getLostFoundList);
router.post('/', authMiddleware, moderateBody(['title', 'description']), lfCtrl.createLostFound);
router.get('/:id', optionalAuth, lfCtrl.getLostFoundDetail);
router.put('/:id', authMiddleware, moderateBody(['title', 'description']), lfCtrl.updateLostFound);
router.delete('/:id', authMiddleware, lfCtrl.deleteLostFound);
router.patch('/:id/resolve', authMiddleware, lfCtrl.resolveLostFound);
router.get('/:id/comments', optionalAuth, lfCtrl.getLostFoundComments);
router.post('/:id/comments', authMiddleware, moderateBody(['content']), lfCtrl.createLostFoundComment);
router.delete('/:id/comments/:commentId', authMiddleware, lfCtrl.deleteLostFoundComment);

export default router;
