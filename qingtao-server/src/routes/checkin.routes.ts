import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/checkin.controller';

const router = Router();
router.use(authMiddleware);

router.post('/', ctrl.checkin);
router.get('/', ctrl.getStatus);

export default router;
