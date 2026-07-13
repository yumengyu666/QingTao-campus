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
const upload_1 = require("../middleware/upload");
const rateLimiter_1 = require("../middleware/rateLimiter");
const uploadCtrl = __importStar(require("../controllers/upload.controller"));
const router = (0, express_1.Router)();
router.post('/image', auth_1.authMiddleware, rateLimiter_1.uploadLimiter, upload_1.upload.array('images', 9), upload_1.verifyImageMagic, uploadCtrl.uploadImage);
router.post('/file', auth_1.authMiddleware, upload_1.uploadDocument.single('file'), upload_1.verifyDocumentMagic, uploadCtrl.uploadFile);
router.post('/avatar', auth_1.authMiddleware, upload_1.upload.single('avatar'), upload_1.verifyImageMagic, uploadCtrl.uploadAvatar);
router.post('/voice', auth_1.authMiddleware, upload_1.uploadVoice.single('voice'), uploadCtrl.uploadVoice);
router.post('/video', auth_1.authMiddleware, rateLimiter_1.uploadLimiter, upload_1.uploadDocument.single('video'), uploadCtrl.uploadFile);
router.post('/chat-file', auth_1.authMiddleware, upload_1.uploadDocument.single('file'), upload_1.verifyDocumentMagic, uploadCtrl.uploadChatFile);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map