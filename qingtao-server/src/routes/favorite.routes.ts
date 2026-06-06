import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as favCtrl from '../controllers/favorite.controller';

const router = Router();

router.get('/', authMiddleware, favCtrl.getFavoritesList);
router.get('/check/:goodsId', authMiddleware, favCtrl.checkFavorite);
router.post('/', authMiddleware, favCtrl.addFavorite);
router.delete('/:id', authMiddleware, favCtrl.removeFavorite);

export default router;
