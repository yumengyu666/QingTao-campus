import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/reservation.controller';

const router = Router();
router.use(authMiddleware);

router.post('/', ctrl.createReservation);
router.get('/', ctrl.getMyReservations);
router.patch('/:id/accept', ctrl.acceptReservation);
router.patch('/:id/reject', ctrl.rejectReservation);
router.delete('/:id', ctrl.cancelReservation);

export default router;
