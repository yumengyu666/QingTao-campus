import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/videos.controller';

const router = Router();

// 公开
router.get('/feed', optionalAuth, ctrl.getVideoFeed);
router.get('/search', ctrl.searchVideos);
router.get('/user/:userId', ctrl.getUserVideos);
router.get('/:id', optionalAuth, ctrl.getVideoDetail);
router.get('/:id/comments', ctrl.getVideoComments);

// 需登录
router.use(authMiddleware);
router.post('/', moderateBody(['description']), ctrl.createVideo);
router.delete('/:id', ctrl.deleteVideo);
router.post('/:id/like', ctrl.toggleLikeVideo);
router.post('/:id/comments', moderateBody(['content']), ctrl.createVideoComment);
router.delete('/:id/comments/:cid', ctrl.deleteVideoComment);
router.post('/:id/view', ctrl.recordView);
router.post('/:id/share', ctrl.shareVideo);

export default router;
