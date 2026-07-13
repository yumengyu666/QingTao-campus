"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const rateLimiter_1 = require("../middleware/rateLimiter");
const schemas_1 = require("../schemas");
const authCtrl = __importStar(require("../controllers/auth.controller"));
const sqCtrl = __importStar(require("../controllers/securityQuestion.controller"));
const router = (0, express_1.Router)();
// 登录/注册不需要内容审核（用户名/密码有固定格式校验，密码只有自己知道）
router.post('/register', rateLimiter_1.registerLimiter, (0, validate_1.validate)(schemas_1.registerSchema), authCtrl.register);
router.post('/login', rateLimiter_1.loginLimiter, (0, validate_1.validate)(schemas_1.loginSchema), authCtrl.login);
router.post('/refresh', (0, validate_1.validate)(schemas_1.refreshTokenSchema), authCtrl.refreshToken);
router.get('/me', auth_1.authMiddleware, authCtrl.getMe);
// 忘记密码（无auth，有频率限制）
router.post('/forgot-password', rateLimiter_1.loginLimiter, authCtrl.forgotPassword);
router.post('/reset-password', rateLimiter_1.loginLimiter, authCtrl.resetPassword);
router.post('/verify-questions', rateLimiter_1.loginLimiter, sqCtrl.verifyQuestions);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map