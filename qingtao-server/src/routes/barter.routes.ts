import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/barter.controller';

const router = Router();
router.use(authMiddleware);

router.post('/', moderateBody(['message']), ctrl.proposeBarter);
router.get('/', ctrl.getProposals);
router.patch('/:id/accept', ctrl.acceptBarter);
router.patch('/:id/reject', ctrl.rejectBarter);

export default router;
