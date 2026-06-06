import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { moderateBody } from '../middleware/moderation.middleware';
import * as userCtrl from '../controllers/user.controller';
import * as sqCtrl from '../controllers/securityQuestion.controller';
import { getUserReviews } from '../controllers/trade.controller';

const router = Router();

// 具体路径必须在 /:id 前面，否则会被 /:id 吞掉
router.get('/profile/changes', authMiddleware, userCtrl.getMyProfileChanges);
router.put('/profile', authMiddleware, moderateBody(['nickname', 'wechat', 'qq', 'bio']), userCtrl.updateProfile);
router.put('/password', authMiddleware, userCtrl.updatePassword);
router.delete('/me', authMiddleware, userCtrl.deleteAccount);
router.get('/me/notif-prefs', authMiddleware, userCtrl.getNotifPrefs);
router.put('/me/notif-prefs', authMiddleware, userCtrl.updateNotifPrefs);

// Security questions
router.get('/security-questions', authMiddleware, sqCtrl.getMyQuestions);
router.put('/security-questions', authMiddleware, sqCtrl.setQuestions);
router.get('/:username/questions', sqCtrl.getUserQuestions);

// Trade reviews
router.get('/:id/reviews', getUserReviews);

router.get('/:id', optionalAuth, userCtrl.getUserProfile);
router.post('/:id/follow', authMiddleware, userCtrl.followUser);
router.delete('/:id/follow', authMiddleware, userCtrl.unfollowUser);
router.get('/:id/followers', userCtrl.getFollowers);
router.get('/:id/following', userCtrl.getFollowing);
router.get('/:id/goods', optionalAuth, userCtrl.getUserGoods);
router.get('/:id/posts', optionalAuth, userCtrl.getUserPosts);

export default router;
