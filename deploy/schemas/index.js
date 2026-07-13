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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Zod 校验模式统一导出
 *
 * 使用方式：
 *   import { validate } from '@/middleware/validate';
 *   import { createGoodsSchema } from '@/schemas';
 *   router.post('/', authMiddleware, validate(createGoodsSchema), controller.create);
 */
__exportStar(require("./common.schema"), exports);
__exportStar(require("./auth.schema"), exports);
__exportStar(require("./goods.schema"), exports);
__exportStar(require("./post.schema"), exports);
__exportStar(require("./message.schema"), exports);
//# sourceMappingURL=index.js.map