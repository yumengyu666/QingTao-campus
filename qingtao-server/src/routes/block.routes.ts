import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/block.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', ctrl.getBlockedList);
router.post('/:userId', ctrl.blockUser);
router.delete('/:userId', ctrl.unblockUser);

export default router;
