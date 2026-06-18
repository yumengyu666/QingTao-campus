import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addToCartSchema } from '../schemas';
import * as cartCtrl from '../controllers/cart.controller';

const router = Router();

router.get('/', authMiddleware, cartCtrl.getCartList);
router.get('/count', authMiddleware, cartCtrl.getCartCount);
router.post('/', authMiddleware, validate(addToCartSchema), cartCtrl.addToCart);
router.delete('/:id', authMiddleware, cartCtrl.removeFromCart);

export default router;
