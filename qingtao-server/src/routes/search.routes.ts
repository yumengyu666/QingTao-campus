import { Router } from 'express';
import * as searchCtrl from '../controllers/search.controller';

const router = Router();

router.get('/', searchCtrl.search);
router.get('/hot', searchCtrl.getHotSearches);
router.get('/history', searchCtrl.getSearchHistory);

export default router;
