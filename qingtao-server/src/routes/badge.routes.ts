import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/badge.controller';

const router = Router();

router.get('/all', ctrl.getAllBadges);
router.get('/', authMiddleware, ctrl.getMyBadges);

export default router;
