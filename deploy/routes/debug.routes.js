"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
/** GET /api/debug/limits — 查看当前限流配置（仅管理员） */
router.get('/limits', auth_1.authMiddleware, auth_1.adminMiddleware, async (_req, res) => {
    const info = {
        global: '500 req/min per IP',
        login: '10 req/min per IP',
        register: '5 req/min per IP',
        publish: '30 req/min per user',
        sensitiveOp: '3 req/hour per user',
        agent: '50 req/day per user',
        messages: '30 req/min per user',
        typing: '20 req/min per user',
        health: '30 req/min per IP',
    };
    return (0, response_1.success)(res, info);
});
exports.default = router;
//# sourceMappingURL=debug.routes.js.map