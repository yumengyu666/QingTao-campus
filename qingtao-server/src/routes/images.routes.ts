import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/images.controller';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/', ctrl.getImages);
router.post('/:id/approve', ctrl.approveImage);
router.post('/:id/reject', ctrl.rejectImage);

export default router;
