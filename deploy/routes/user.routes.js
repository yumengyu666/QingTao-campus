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
const moderation_middleware_1 = require("../middleware/moderation.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const userCtrl = __importStar(require("../controllers/user.controller"));
const sqCtrl = __importStar(require("../controllers/securityQuestion.controller"));
const trade_controller_1 = require("../controllers/trade.controller");
const router = (0, express_1.Router)();
// 具体路径必须在 /:id 前面，否则会被 /:id 吞掉
router.get('/leaderboard', userCtrl.getLeaderboard);
router.get('/profile/changes', auth_1.authMiddleware, userCtrl.getMyProfileChanges);
router.put('/profile', auth_1.authMiddleware, (0, moderation_middleware_1.moderateBody)(['nickname', 'wechat', 'qq', 'bio']), userCtrl.updateProfile);
router.put('/password', auth_1.authMiddleware, rateLimiter_1.sensitiveOpLimiter, userCtrl.updatePassword);
router.delete('/me', auth_1.authMiddleware, rateLimiter_1.sensitiveOpLimiter, userCtrl.deleteAccount);
router.get('/me/notif-prefs', auth_1.authMiddleware, userCtrl.getNotifPrefs);
router.put('/me/notif-prefs', auth_1.authMiddleware, userCtrl.updateNotifPrefs);
// Security questions
router.get('/security-questions', auth_1.authMiddleware, sqCtrl.getMyQuestions);
router.put('/security-questions', auth_1.authMiddleware, sqCtrl.setQuestions);
router.get('/:username/questions', sqCtrl.getUserQuestions);
// Trade reviews
router.get('/:id/reviews', trade_controller_1.getUserReviews);
router.get('/:id', auth_1.optionalAuth, userCtrl.getUserProfile);
router.post('/:id/follow', auth_1.authMiddleware, userCtrl.followUser);
router.delete('/:id/follow', auth_1.authMiddleware, userCtrl.unfollowUser);
router.get('/:id/followers', userCtrl.getFollowers);
router.get('/:id/following', userCtrl.getFollowing);
router.get('/:id/goods', auth_1.optionalAuth, userCtrl.getUserGoods);
router.get('/:id/posts', auth_1.optionalAuth, userCtrl.getUserPosts);
exports.default = router;
//# sourceMappingURL=user.routes.js.map