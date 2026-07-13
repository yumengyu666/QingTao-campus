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
const ctrl = __importStar(require("../controllers/treehole.controller"));
const router = (0, express_1.Router)();
// 树洞匿名社区 — 游客可访问，optionalAuth 用于已登录用户的 userId 记录
router.get('/', auth_1.optionalAuth, ctrl.getList);
router.post('/', auth_1.optionalAuth, rateLimiter_1.publishLimiter, (0, moderation_middleware_1.moderateBody)(['content']), ctrl.createPost);
router.get('/:id', auth_1.optionalAuth, ctrl.getDetail);
router.post('/:id/comments', auth_1.optionalAuth, rateLimiter_1.publishLimiter, (0, moderation_middleware_1.moderateBody)(['content']), ctrl.createComment);
router.post('/:id/like', auth_1.optionalAuth, ctrl.toggleLike);
exports.default = router;
//# sourceMappingURL=treehole.routes.js.map