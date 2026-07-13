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
const adminCtrl = __importStar(require("../controllers/admin.controller"));
const bannerCtrl = __importStar(require("../controllers/banner.controller"));
const imageCtrl = __importStar(require("../controllers/images.controller"));
const router = (0, express_1.Router)();
// All admin routes require auth + admin role
router.use(auth_1.authMiddleware, auth_1.adminMiddleware);
// Stats
router.get('/stats', adminCtrl.getStats);
// Image Review (replaces old content review)
router.get('/images', imageCtrl.getImages);
router.post('/images/:id/approve', imageCtrl.approveImage);
router.post('/images/:id/reject', imageCtrl.rejectImage);
// Users
router.get('/users', adminCtrl.getUserList);
router.patch('/users/:id/status', adminCtrl.toggleUserStatus);
router.delete('/users/:id', adminCtrl.deleteUser);
// Categories
router.post('/categories', adminCtrl.createCategory);
router.put('/categories/:id', adminCtrl.updateCategory);
router.delete('/categories/:id', adminCtrl.deleteCategory);
// Announcements
router.post('/announcements', adminCtrl.createAnnouncement);
// Reports
router.get('/reports', adminCtrl.getReports);
router.post('/reports/:id/handle', adminCtrl.handleReport);
// Content Review
router.get('/content/pending', adminCtrl.getPendingContent);
router.post('/content/:type/:id/approve', adminCtrl.approveContent);
router.post('/content/:type/:id/reject', adminCtrl.rejectContent);
// Banners
router.post('/banners', bannerCtrl.createBanner);
router.put('/banners/:id', bannerCtrl.updateBanner);
router.delete('/banners/:id', bannerCtrl.deleteBanner);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map