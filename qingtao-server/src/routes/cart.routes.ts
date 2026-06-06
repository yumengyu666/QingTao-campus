import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as cartCtrl from '../controllers/cart.controller';

const router = Router();

router.get('/', authMiddleware, cartCtrl.getCartList);
router.get('/count', authMiddleware, cartCtrl.getCartCount);
router.post('/', authMiddleware, cartCtrl.addToCart);
router.delete('/:id', authMiddleware, cartCtrl.removeFromCart);

export default router;
