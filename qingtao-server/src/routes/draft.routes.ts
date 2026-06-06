import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/draft.controller';

const router = Router();
router.use(authMiddleware);

router.post('/', ctrl.saveDraft);
router.get('/:type', ctrl.getDraft);
router.delete('/:type', ctrl.deleteDraft);

export default router;
