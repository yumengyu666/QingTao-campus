import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { publishLimiter } from '../middleware/rateLimiter';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/trade.controller';

const router = Router();
router.use(authMiddleware);

// 购买意向
router.post('/intent', publishLimiter, moderateBody(['message']), ctrl.createIntent);
router.get('/intents', ctrl.getMyIntents);

// 卖家操作
router.put('/:id/accept', ctrl.acceptIntent);
router.put('/:id/reject', ctrl.rejectIntent);
router.put('/:id/complete', ctrl.completeTrade);

// 交易评价
router.post('/:id/review', moderateBody(['comment']), ctrl.submitReview);

export default router;
