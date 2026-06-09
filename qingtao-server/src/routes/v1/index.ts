import { Router, Request, Response } from 'express';

const router = Router();

/** API版本管理 — 对应任务 #69 [后端R18] */

router.get('/', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    deprecated: false,
    sunset: null,
    docs: '/api/docs',
  });
});

// 废弃接口301重定向到v1
router.use('/old-search', (_req: Request, res: Response) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
  res.redirect(301, '/api/search');
});

export default router;
