"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.etagCache = etagCache;
const crypto_1 = __importDefault(require("crypto"));
function etagCache(maxAgeSeconds = 300) {
    return (req, res, next) => {
        if (req.method !== 'GET')
            return next();
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // 计算 ETag
            const hash = crypto_1.default.createHash('md5').update(JSON.stringify(body)).digest('hex');
            const etag = `"${hash}"`;
            // 设置缓存头
            res.setHeader('ETag', etag);
            res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);
            // 检查 If-None-Match
            const clientEtag = req.headers['if-none-match'];
            if (clientEtag === etag) {
                return res.status(304).end();
            }
            return originalJson(body);
        };
        next();
    };
}
//# sourceMappingURL=etag.js.map