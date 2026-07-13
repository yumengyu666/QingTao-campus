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
const auth_2 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const moderation_middleware_1 = require("../middleware/moderation.middleware");
const schemas_1 = require("../schemas");
const goodsCtrl = __importStar(require("../controllers/goods.controller"));
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.get('/', (0, validate_1.validate)({ query: schemas_1.goodsListQuery }), goodsCtrl.getGoodsList);
router.get('/newest', goodsCtrl.getNewest);
router.get('/hot', goodsCtrl.getHot);
router.get('/:id/related', goodsCtrl.getRelatedGoods);
router.get('/:id', auth_2.optionalAuth, goodsCtrl.getGoodsDetail);
router.post('/', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.createGoodsSchema), (0, moderation_middleware_1.moderateBody)(['title', 'description']), goodsCtrl.createGoods);
router.put('/:id', auth_1.authMiddleware, (0, validate_1.validate)(schemas_1.updateGoodsSchema), (0, moderation_middleware_1.moderateBody)(['title', 'description']), goodsCtrl.updateGoods);
router.delete('/:id', auth_1.authMiddleware, goodsCtrl.deleteGoods);
router.patch('/:id/sold', auth_1.authMiddleware, goodsCtrl.markSold);
router.patch('/:id/unsell', auth_1.authMiddleware, goodsCtrl.unmarkSold);
router.patch('/:id/offline', auth_1.authMiddleware, goodsCtrl.markOffline);
router.patch('/:id/relist', auth_1.authMiddleware, goodsCtrl.relist);
router.get('/:id/comments', auth_2.optionalAuth, goodsCtrl.getGoodsComments);
router.post('/:id/comments', auth_1.authMiddleware, rateLimiter_1.commentLimiter, (0, validate_1.validate)(schemas_1.createGoodsCommentSchema), (0, moderation_middleware_1.moderateBody)(['content']), goodsCtrl.createGoodsComment);
router.delete('/:id/comments/:commentId', auth_1.authMiddleware, goodsCtrl.deleteGoodsComment);
exports.default = router;
//# sourceMappingURL=goods.routes.js.map