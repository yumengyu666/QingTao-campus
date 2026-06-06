import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import { publishLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/treehole.controller';

const router = Router();

// 树洞匿名社区 — 游客可访问，optionalAuth 用于已登录用户的 userId 记录
router.get('/', optionalAuth, ctrl.getList);
router.post('/', optionalAuth, publishLimiter, moderateBody(['content']), ctrl.createPost);
router.get('/:id', optionalAuth, ctrl.getDetail);
router.post('/:id/comments', optionalAuth, publishLimiter, moderateBody(['content']), ctrl.createComment);
router.post('/:id/like', optionalAuth, ctrl.toggleLike);

export default router;
