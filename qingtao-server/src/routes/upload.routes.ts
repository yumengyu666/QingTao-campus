import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { upload, uploadDocument, uploadVoice, verifyImageMagic, verifyDocumentMagic } from '../middleware/upload';
import { uploadLimiter, searchLimiter } from '../middleware/rateLimiter';
import * as uploadCtrl from '../controllers/upload.controller';

const router = Router();

router.post('/image', authMiddleware, uploadLimiter, upload.array('images', 9), verifyImageMagic, uploadCtrl.uploadImage);
router.post('/file', authMiddleware, uploadDocument.single('file'), verifyDocumentMagic, uploadCtrl.uploadFile);
router.post('/avatar', authMiddleware, upload.single('avatar'), verifyImageMagic, uploadCtrl.uploadAvatar);
router.post('/voice', authMiddleware, uploadVoice.single('voice'), uploadCtrl.uploadVoice);
router.post('/video', authMiddleware, uploadLimiter, uploadDocument.single('video'), uploadCtrl.uploadFile);
router.post('/chat-file', authMiddleware, uploadDocument.single('file'), verifyDocumentMagic, uploadCtrl.uploadChatFile);

export default router;