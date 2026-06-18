import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/calls.controller';

const router = Router();
router.use(authMiddleware);

router.post('/initiate', ctrl.initiateCall);
router.get('/history', ctrl.getCallHistory);
router.get('/:id', ctrl.getCallStatus);
router.post('/:id/answer', ctrl.answerCall);
router.post('/:id/reject', ctrl.rejectCall);
router.post('/:id/end', ctrl.endCall);

export default router;
