import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { success } from '../utils/response';

const router = Router();

/** GET /api/debug/limits — 查看当前限流配置（仅管理员） */
router.get('/limits', authMiddleware, adminMiddleware, async (_req, res) => {
  const info = {
    global: '500 req/min per IP',
    login: '10 req/min per IP',
    register: '5 req/min per IP',
    publish: '30 req/min per user',
    sensitiveOp: '3 req/hour per user',
    agent: '50 req/day per user',
    messages: '30 req/min per user',
    typing: '20 req/min per user',
    health: '30 req/min per IP',
  };
  return success(res, info);
});

export default router;
