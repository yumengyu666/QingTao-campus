import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { upload, uploadDocument } from '../middleware/upload';
import * as uploadCtrl from '../controllers/upload.controller';

const router = Router();

router.post('/image', authMiddleware, upload.array('images', 9), uploadCtrl.uploadImage);
router.post('/file', authMiddleware, uploadDocument.single('file'), uploadCtrl.uploadFile);
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadCtrl.uploadAvatar);

export default router;
