"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/** API版本管理 — 对应任务 #69 [后端R18] */
router.get('/', (_req, res) => {
    res.json({
        version: '1.0.0',
        deprecated: false,
        sunset: null,
        docs: '/api/docs',
    });
});
// 废弃接口301重定向到v1
router.use('/old-search', (_req, res) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
    res.redirect(301, '/api/search');
});
exports.default = router;
//# sourceMappingURL=index.js.map