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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("../middleware/auth");
const moderation_middleware_1 = require("../middleware/moderation.middleware");
const ctrl = __importStar(require("../controllers/dating.controller"));
const msgCtrl = __importStar(require("../controllers/datingMessage.controller"));
const dmCtrl = __importStar(require("../controllers/dailyMatch.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Rate limit: 30 messages per minute
const messageLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => String(req.user?.userId || req.ip),
    message: { code: 429, message: '发送太频繁，请稍后再试', data: null },
});
const typingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => String(req.user?.userId || req.ip),
    message: { code: 429, message: '请求过于频繁', data: null },
});
// Request management — specific routes before parameterized
router.get('/requests', ctrl.getRequests);
router.patch('/requests/:requestId', ctrl.handleRequest);
// Profile & posts
router.get('/profile', ctrl.getProfile);
router.post('/profile', (0, moderation_middleware_1.moderateBody)(['nickname', 'bio']), ctrl.updateProfile);
router.get('/posts', ctrl.getPosts);
router.post('/posts', (0, moderation_middleware_1.moderateBody)(['content']), ctrl.createPost);
router.put('/posts/:postId', (0, moderation_middleware_1.moderateBody)(['content']), ctrl.updatePost);
router.delete('/posts/:postId', ctrl.deletePost);
// Follow & request (parameterized userId)
router.get('/following', ctrl.getFollowing);
router.post('/:userId/follow', ctrl.followUser);
router.delete('/:userId/follow', ctrl.unfollowUser);
router.post('/:userId/request', ctrl.sendRequest);
router.delete('/relationship/:userId', ctrl.breakRelationship);
// Dating messages
router.get('/conversations', msgCtrl.getConversations);
router.get('/messages/unread-count', msgCtrl.getUnreadCount);
router.get('/messages/:userId', msgCtrl.getMessages);
router.post('/messages/:userId', messageLimiter, msgCtrl.sendMessage);
router.post('/messages/:userId/typing', typingLimiter, msgCtrl.setTyping);
router.get('/messages/:userId/typing', msgCtrl.getTyping);
// Daily Match — 每日缘分
router.get('/daily-match', dmCtrl.getDailyMatch);
router.post('/daily-match/:id/reveal', dmCtrl.revealIdentity);
exports.default = router;
//# sourceMappingURL=dating.routes.js.map