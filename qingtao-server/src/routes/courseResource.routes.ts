import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as ctrl from '../controllers/courseResource.controller';

const router = Router();

// 列表和详情支持未登录浏览
router.get('/', optionalAuth, ctrl.getResources);
router.get('/:id', optionalAuth, ctrl.getResource);

// 上传/编辑/删除需登录
router.post('/', authMiddleware, moderateBody(['title', 'description', 'courseName']), ctrl.createResource);
router.put('/:id', authMiddleware, moderateBody(['title', 'description', 'courseName']), ctrl.updateResource);
router.delete('/:id', authMiddleware, ctrl.deleteResource);

// 点赞
router.post('/:id/like', authMiddleware, ctrl.toggleLike);

// 举报
router.post('/:id/report', authMiddleware, ctrl.reportResource);

// 下载计数
router.post('/:id/download', optionalAuth, ctrl.downloadResource);

export default router;
