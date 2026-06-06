import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as postCtrl from '../controllers/post.controller';

const router = Router();

router.get('/', postCtrl.getPostList);
router.post('/', authMiddleware, moderateBody(['title', 'content']), postCtrl.createPost);
router.get('/:id', optionalAuth, postCtrl.getPostDetail);
router.put('/:id', authMiddleware, moderateBody(['title', 'content']), postCtrl.updatePost);
router.delete('/:id', authMiddleware, postCtrl.deletePost);
router.get('/:id/comments', optionalAuth, postCtrl.getPostComments);
router.post('/:id/comments', authMiddleware, moderateBody(['content']), postCtrl.createPostComment);
router.delete('/:id/comments/:commentId', authMiddleware, postCtrl.deletePostComment);

export default router;
