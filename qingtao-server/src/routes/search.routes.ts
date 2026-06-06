import { Router } from 'express';
import * as searchCtrl from '../controllers/search.controller';

const router = Router();

router.get('/', searchCtrl.search);
router.get('/hot', searchCtrl.getHotSearches);

export default router;
