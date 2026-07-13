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
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const goods_routes_1 = __importDefault(require("./goods.routes"));
const cart_routes_1 = __importDefault(require("./cart.routes"));
const favorite_routes_1 = __importDefault(require("./favorite.routes"));
const post_routes_1 = __importDefault(require("./post.routes"));
const lostfound_routes_1 = __importDefault(require("./lostfound.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const upload_routes_1 = __importDefault(require("./upload.routes"));
const search_routes_1 = __importDefault(require("./search.routes"));
const category_routes_1 = __importDefault(require("./category.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const messages_routes_1 = __importDefault(require("./messages.routes"));
const dating_routes_1 = __importDefault(require("./dating.routes"));
const qa_routes_1 = __importDefault(require("./qa.routes"));
const block_routes_1 = __importDefault(require("./block.routes"));
const treehole_routes_1 = __importDefault(require("./treehole.routes"));
const courseResource_routes_1 = __importDefault(require("./courseResource.routes"));
const draft_routes_1 = __importDefault(require("./draft.routes"));
const trade_routes_1 = __importDefault(require("./trade.routes"));
const reservation_routes_1 = __importDefault(require("./reservation.routes"));
const wanted_routes_1 = __importDefault(require("./wanted.routes"));
const checkin_routes_1 = __importDefault(require("./checkin.routes"));
const barter_routes_1 = __importDefault(require("./barter.routes"));
const badge_routes_1 = __importDefault(require("./badge.routes"));
const tag_routes_1 = __importDefault(require("./tag.routes"));
const notes_routes_1 = __importDefault(require("./notes.routes"));
const videos_routes_1 = __importDefault(require("./videos.routes"));
const collections_routes_1 = __importDefault(require("./collections.routes"));
const calls_routes_1 = __importDefault(require("./calls.routes"));
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const admin_controller_1 = require("../controllers/admin.controller");
const banner_controller_1 = require("../controllers/banner.controller");
const captcha_controller_1 = require("../controllers/captcha.controller");
const images_controller_1 = require("../controllers/images.controller");
const report_controller_1 = require("../controllers/report.controller");
const history_controller_1 = require("../controllers/history.controller");
const feed_controller_1 = require("../controllers/feed.controller");
const explore_controller_1 = require("../controllers/explore.controller");
const analytics_controller_1 = require("../controllers/analytics.controller");
const reportStats_controller_1 = require("../controllers/reportStats.controller");
const statsCtrl = __importStar(require("../controllers/stats.controller"));
const leaderboard_controller_1 = require("../controllers/leaderboard.controller");
const sse_controller_1 = require("../controllers/sse.controller");
const points_controller_1 = require("../controllers/points.controller");
const health_controller_1 = require("../controllers/health.controller");
const log_controller_1 = require("../controllers/log.controller");
const admin_extend_controller_1 = require("../controllers/admin.extend.controller");
const index_1 = __importDefault(require("./v1/index"));
const debug_routes_1 = __importDefault(require("./debug.routes"));
const agent_controller_1 = require("../controllers/agent.controller");
const circuit_breaker_1 = require("../middleware/circuit-breaker");
const router = (0, express_1.Router)();
// SSE 实时推送（不需要 authMiddleware，token 通过 query 传递）
router.get('/sse/notifications', sse_controller_1.sseNotifications);
// Health check — public
router.get('/health', health_controller_1.healthCheck);
router.get('/health/metrics', health_controller_1.getMetrics);
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.get('/users/me/points', auth_1.authMiddleware, points_controller_1.getMyPoints);
router.use('/goods', goods_routes_1.default);
router.use('/cart', cart_routes_1.default);
router.use('/favorites', favorite_routes_1.default);
router.use('/posts', post_routes_1.default);
router.use('/lostfound', lostfound_routes_1.default);
router.use('/notifications', notification_routes_1.default);
router.use('/upload', upload_routes_1.default);
router.use('/search', search_routes_1.default);
router.use('/categories', category_routes_1.default);
router.use('/drafts', draft_routes_1.default);
router.use('/admin', admin_routes_1.default);
router.use('/messages', messages_routes_1.default);
router.use('/dating', dating_routes_1.default);
router.use('/qa', qa_routes_1.default);
router.use('/block', block_routes_1.default);
router.use('/treehole', treehole_routes_1.default);
router.use('/resources', courseResource_routes_1.default);
router.use('/trades', trade_routes_1.default);
router.use('/reservations', reservation_routes_1.default);
router.use('/wanted', wanted_routes_1.default);
router.use('/checkin', checkin_routes_1.default);
router.use('/barter', barter_routes_1.default);
router.use('/badges', badge_routes_1.default);
router.use('/tags', tag_routes_1.default);
router.use('/notes', notes_routes_1.default);
router.use('/videos', videos_routes_1.default);
router.use('/collections', collections_routes_1.default);
router.use('/calls', calls_routes_1.default);
router.get('/banners', banner_controller_1.getBanners);
router.get('/captcha/generate', captcha_controller_1.generateCaptcha);
// Stats — public
router.get('/stats/leaderboard', statsCtrl.getLeaderboard);
router.get('/stats/summary', statsCtrl.getSummary);
// Leaderboard — new ranking API
router.get('/leaderboard', leaderboard_controller_1.getLeaderboard);
// History — recently viewed
router.get('/history/views', auth_1.authMiddleware, history_controller_1.getRecentViews);
router.post('/history/views/:goodsId', auth_1.authMiddleware, history_controller_1.trackView);
// Feed — 关注动态流
router.get('/feed', auth_1.authMiddleware, feed_controller_1.getFollowingFeed);
// Explore — 发现页聚合
router.get('/explore', explore_controller_1.getExplore);
// Analytics — 趋势 + 用户分析
router.get('/analytics/trending', analytics_controller_1.getTrending);
router.get('/analytics/user/:userId', analytics_controller_1.getUserAnalytics);
router.get('/admin/reports/stats', auth_1.authMiddleware, auth_1.adminMiddleware, reportStats_controller_1.getReportStats);
// Report — auth required but not admin
router.post('/reports', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.submitReportSchema), admin_controller_1.submitReport);
router.post('/reports/appeal', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.submitAppealSchema), admin_controller_1.submitAppeal);
router.post('/reports/messages', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.reportMessageSchema), report_controller_1.reportMessages);
router.post('/admin/content/batch', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_1.batchReview);
router.get('/admin/audit-logs', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_1.getAuditLogs);
router.get('/admin/export/:type', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_1.exportCSV);
// Image status check — any logged-in user
router.get('/images/status', auth_1.authMiddleware, images_controller_1.checkStatus);
// Image batch review — admin only
router.post('/admin/images/batch', auth_1.authMiddleware, auth_1.adminMiddleware, images_controller_1.batchImageReview);
router.get('/admin/stats/review', auth_1.authMiddleware, auth_1.adminMiddleware, images_controller_1.getReviewStats);
// Agent chat — 智能助手小轻 (auth required + rate limited + circuit breaker)
const rateLimiter_1 = require("../middleware/rateLimiter");
const agentCircuit = (0, circuit_breaker_1.circuitBreaker)('agent-chat');
router.post('/agent/chat', auth_1.authMiddleware, rateLimiter_1.agentLimiter, agentCircuit, agent_controller_1.agentChat);
router.post('/agent/chat/stream', auth_1.authMiddleware, rateLimiter_1.agentLimiter, agentCircuit, agent_controller_1.agentChatStream);
router.post('/agent/chat/clear', auth_1.authMiddleware, agent_controller_1.clearConversation);
router.post('/agent/feedback', auth_1.authMiddleware, agent_controller_1.submitFeedback);
router.get('/agent/sessions', auth_1.authMiddleware, agent_controller_1.listSessions);
router.get('/agent/sessions/:id', auth_1.authMiddleware, agent_controller_1.getSession);
router.delete('/agent/sessions/:id', auth_1.authMiddleware, agent_controller_1.deleteSession);
// Sensitive word management — admin only
const admin_controller_2 = require("../controllers/admin.controller");
router.get('/admin/sensitive-words', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_2.getSensitiveWords);
router.post('/admin/sensitive-words', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_2.addSensitiveWord);
router.put('/admin/sensitive-words/:id', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_2.updateSensitiveWord);
router.delete('/admin/sensitive-words/:id', auth_1.authMiddleware, auth_1.adminMiddleware, admin_controller_2.deleteSensitiveWord);
// Admin dashboard + audit logs — admin only
router.get('/admin/dashboard', auth_1.authMiddleware, auth_1.adminMiddleware, log_controller_1.adminDashboard);
router.get('/admin/audit', auth_1.authMiddleware, auth_1.adminMiddleware, log_controller_1.getAdminLogs);
router.post('/admin/batch-status', auth_1.authMiddleware, auth_1.adminMiddleware, admin_extend_controller_1.batchUpdateStatus);
router.get('/admin/activity-logs', auth_1.authMiddleware, auth_1.adminMiddleware, admin_extend_controller_1.activityLogsHandler);
// API v1 版本路由
router.use('/v1', index_1.default);
// Debug 路由（管理限流配置查看等）
router.use('/debug', debug_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map