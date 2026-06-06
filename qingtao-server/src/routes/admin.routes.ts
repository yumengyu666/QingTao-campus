import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import * as adminCtrl from '../controllers/admin.controller';
import * as bannerCtrl from '../controllers/banner.controller';
import * as imageCtrl from '../controllers/images.controller';

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

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

export default router;
