import { Router } from 'express';
import * as catCtrl from '../controllers/category.controller';

const router = Router();

router.get('/', catCtrl.getCategories);

export default router;
