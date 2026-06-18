import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/notes.controller';

const router = Router();

// 公开路由
router.get('/', ctrl.getNotes);
router.get('/:id', optionalAuth, ctrl.getNoteDetail);

// 需登录
router.use(authMiddleware);
router.post('/', moderateBody(['title', 'content']), ctrl.createNote);
router.put('/:id', ctrl.updateNote);
router.delete('/:id', ctrl.deleteNote);

// 互动
router.get('/:id/like/status', ctrl.getLikeStatus);
router.post('/:id/like', ctrl.toggleLikeNote);
router.post('/:id/save', ctrl.saveNote);
router.delete('/:id/save', ctrl.unsaveNote);
router.post('/:id/share', ctrl.shareNote);

export default router;
