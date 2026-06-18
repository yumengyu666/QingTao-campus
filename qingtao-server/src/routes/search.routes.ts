import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiter';
import * as searchCtrl from '../controllers/search.controller';

const router = Router();

router.get('/', searchLimiter, searchCtrl.search);
router.get('/hot', searchCtrl.getHotSearches);
router.get('/history', authMiddleware, searchCtrl.getSearchHistory);

export default router;
