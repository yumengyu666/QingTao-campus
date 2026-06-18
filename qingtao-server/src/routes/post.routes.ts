import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { moderateBody } from '../middleware/moderation.middleware';
import { createPostSchema, updatePostSchema, postListQuery, createPostCommentSchema } from '../schemas';
import * as postCtrl from '../controllers/post.controller';
import { commentLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', validate({ query: postListQuery }), postCtrl.getPostList);
router.post('/', authMiddleware, validate(createPostSchema), moderateBody(['title', 'content']), postCtrl.createPost);
router.get('/:id', optionalAuth, postCtrl.getPostDetail);
router.put('/:id', authMiddleware, validate(updatePostSchema), moderateBody(['title', 'content']), postCtrl.updatePost);
router.delete('/:id', authMiddleware, postCtrl.deletePost);
router.get('/:id/comments', optionalAuth, postCtrl.getPostComments);
router.post('/:id/comments', authMiddleware, commentLimiter, validate(createPostCommentSchema), moderateBody(['content']), postCtrl.createPostComment);
router.delete('/:id/comments/:commentId', authMiddleware, postCtrl.deletePostComment);

export default router;
