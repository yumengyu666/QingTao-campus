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
const rateLimiter_1 = require("../middleware/rateLimiter");
const moderation_middleware_1 = require("../middleware/moderation.middleware");
const ctrl = __importStar(require("../controllers/trade.controller"));
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// 购买意向
router.post('/intent', rateLimiter_1.publishLimiter, (0, moderation_middleware_1.moderateBody)(['message']), ctrl.createIntent);
router.get('/intents', ctrl.getMyIntents);
// 卖家操作
router.put('/:id/accept', ctrl.acceptIntent);
router.put('/:id/reject', ctrl.rejectIntent);
router.put('/:id/complete', ctrl.completeTrade);
// 交易评价
router.post('/:id/review', (0, moderation_middleware_1.moderateBody)(['comment']), ctrl.submitReview);
exports.default = router;
//# sourceMappingURL=trade.routes.js.map