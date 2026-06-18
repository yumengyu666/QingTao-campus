import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as ctrl from '../controllers/notes.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', ctrl.getCollections);
router.post('/', ctrl.createCollection);
router.put('/:id', ctrl.updateCollection);
router.delete('/:id', ctrl.deleteCollection);
router.get('/:id/notes', ctrl.getCollectionNotes);

export default router;
