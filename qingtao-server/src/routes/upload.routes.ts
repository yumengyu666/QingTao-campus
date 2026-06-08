import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { upload, uploadDocument, verifyImageMagic, verifyDocumentMagic } from '../middleware/upload';
import * as uploadCtrl from '../controllers/upload.controller';

const router = Router();

router.post('/image', authMiddleware, upload.array('images', 9), verifyImageMagic, uploadCtrl.uploadImage);
router.post('/file', authMiddleware, uploadDocument.single('file'), verifyDocumentMagic, uploadCtrl.uploadFile);
router.post('/avatar', authMiddleware, upload.single('avatar'), verifyImageMagic, uploadCtrl.uploadAvatar);

export default router;
