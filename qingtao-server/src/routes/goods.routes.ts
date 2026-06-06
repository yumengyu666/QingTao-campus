import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as goodsCtrl from '../controllers/goods.controller';

const router = Router();

router.get('/', goodsCtrl.getGoodsList);
router.get('/newest', goodsCtrl.getNewest);
router.get('/hot', goodsCtrl.getHot);
router.get('/:id/related', goodsCtrl.getRelatedGoods);
router.get('/:id', optionalAuth, goodsCtrl.getGoodsDetail);
router.post('/', authMiddleware, moderateBody(['title', 'description']), goodsCtrl.createGoods);
router.put('/:id', authMiddleware, moderateBody(['title', 'description']), goodsCtrl.updateGoods);
router.delete('/:id', authMiddleware, goodsCtrl.deleteGoods);
router.patch('/:id/sold', authMiddleware, goodsCtrl.markSold);
router.patch('/:id/unsell', authMiddleware, goodsCtrl.unmarkSold);
router.patch('/:id/offline', authMiddleware, goodsCtrl.markOffline);
router.patch('/:id/relist', authMiddleware, goodsCtrl.relist);
router.get('/:id/comments', optionalAuth, goodsCtrl.getGoodsComments);
router.post('/:id/comments', authMiddleware, moderateBody(['content']), goodsCtrl.createGoodsComment);
router.delete('/:id/comments/:commentId', authMiddleware, goodsCtrl.deleteGoodsComment);

export default router;
