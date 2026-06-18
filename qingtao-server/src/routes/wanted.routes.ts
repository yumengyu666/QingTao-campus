import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import { publishLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/wanted.controller';

const router = Router();

router.get('/', optionalAuth, ctrl.getList);
router.get('/:id', optionalAuth, ctrl.getDetail);
router.post('/', authMiddleware, publishLimiter, moderateBody(['title', 'description']), ctrl.createWanted);
router.delete('/:id', authMiddleware, ctrl.deleteWanted);

export default router;
