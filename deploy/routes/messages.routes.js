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
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const ctrl = __importStar(require("../controllers/messages.controller"));
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Rate limit: 30 messages per minute per user
const messageLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => String(req.user?.userId || req.ip),
    message: { code: 429, message: '发送太频繁，请稍后再试', data: null },
});
// Rate limit: 20 typing pings per minute per user
const typingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => String(req.user?.userId || req.ip),
    message: { code: 429, message: '请求过于频繁', data: null },
});
router.get('/search/all', chat_controller_1.searchChatMessages);
router.get('/search/detail', ctrl.searchMessageDetail);
router.patch('/read/all', chat_controller_1.readAllMessages);
router.get('/unread-count', ctrl.getUnreadCount);
router.get('/conversations', ctrl.getConversations);
router.get('/conversations/settings/:peerId', ctrl.getConversationSetting);
router.put('/conversations/settings/:peerId', ctrl.updateConversationSetting);
router.get('/:userId', ctrl.getMessages);
router.post('/:userId', messageLimiter, (0, validate_1.validate)(schemas_1.sendMessageSchema), ctrl.sendMessage);
router.post('/:userId/typing', typingLimiter, ctrl.setTyping);
router.get('/:userId/typing', ctrl.getTyping);
router.post('/batch-delete', (0, validate_1.validate)(schemas_1.batchMessageSchema), ctrl.batchDeleteMessages);
router.patch('/:id/read', ctrl.markMessageRead);
router.patch('/:id/delivered', ctrl.markDelivered);
router.patch('/:id/recall', ctrl.recallMessage);
exports.default = router;
//# sourceMappingURL=messages.routes.js.map