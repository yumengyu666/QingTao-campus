import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import * as ctrl from '../controllers/wanted.controller';

const router = Router();

router.get('/', optionalAuth, ctrl.getList);
router.get('/:id', optionalAuth, ctrl.getDetail);
router.post('/', authMiddleware, ctrl.createWanted);
router.delete('/:id', authMiddleware, ctrl.deleteWanted);

export default router;
