import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { moderateBody } from '../middleware/moderation.middleware';
import { createLostFoundSchema, updateLostFoundSchema, lostFoundListQuery, createLostFoundCommentSchema } from '../schemas';
import * as lfCtrl from '../controllers/lostfound.controller';
import { commentLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', validate({ query: lostFoundListQuery }), lfCtrl.getLostFoundList);
router.post('/', authMiddleware, validate(createLostFoundSchema), moderateBody(['title', 'description']), lfCtrl.createLostFound);
router.get('/:id', optionalAuth, lfCtrl.getLostFoundDetail);
router.put('/:id', authMiddleware, validate(updateLostFoundSchema), moderateBody(['title', 'description']), lfCtrl.updateLostFound);
router.delete('/:id', authMiddleware, lfCtrl.deleteLostFound);
router.patch('/:id/resolve', authMiddleware, lfCtrl.resolveLostFound);
router.get('/:id/comments', optionalAuth, lfCtrl.getLostFoundComments);
router.post('/:id/comments', authMiddleware, commentLimiter, validate(createLostFoundCommentSchema), moderateBody(['content']), lfCtrl.createLostFoundComment);
router.delete('/:id/comments/:commentId', authMiddleware, lfCtrl.deleteLostFoundComment);

export default router;
