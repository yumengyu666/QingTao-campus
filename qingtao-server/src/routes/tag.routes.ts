import { Router } from 'express';
import * as ctrl from '../controllers/tag.controller';

const router = Router();

router.get('/', ctrl.getTags);
router.get('/:name/posts', ctrl.getPostsByTag);

export default router;
