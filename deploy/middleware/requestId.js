"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const crypto_1 = require("crypto");
/**
 * 请求ID中间件：每个请求生成唯一ID，注入 req.headers 和响应头
 * 用于链路追踪和错误定位
 */
function requestIdMiddleware(req, _res, next) {
    const requestId = (0, crypto_1.randomBytes)(8).toString('hex');
    req.requestId = requestId;
    _res.setHeader('X-Request-ID', requestId);
    next();
}
//# sourceMappingURL=requestId.js.map