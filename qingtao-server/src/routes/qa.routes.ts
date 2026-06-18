import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/qa.controller';
import { commentLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', optionalAuth, ctrl.getList);
router.post('/', authMiddleware, moderateBody(['title', 'content']), ctrl.createPost);
router.get('/:id', optionalAuth, ctrl.getDetail);
router.post('/:id/answers', authMiddleware, commentLimiter, moderateBody(['content']), ctrl.createAnswer);
router.post('/answers/:id/vote', authMiddleware, ctrl.toggleVote);
router.post('/answers/:id/best', authMiddleware, ctrl.markBest);

export default router;
