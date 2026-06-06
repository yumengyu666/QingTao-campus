import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';
import * as authCtrl from '../controllers/auth.controller';
import * as sqCtrl from '../controllers/securityQuestion.controller';

const router = Router();

// 登录/注册不需要内容审核（用户名/密码有固定格式校验，密码只有自己知道）
router.post('/register', registerLimiter, authCtrl.register);
router.post('/login', loginLimiter, authCtrl.login);
router.post('/refresh', authCtrl.refreshToken);
router.get('/me', authMiddleware, authCtrl.getMe);

// 忘记密码（无auth，有频率限制）
router.post('/forgot-password', loginLimiter, authCtrl.forgotPassword);
router.post('/reset-password', loginLimiter, authCtrl.resetPassword);
router.post('/verify-questions', loginLimiter, sqCtrl.verifyQuestions);

export default router;
