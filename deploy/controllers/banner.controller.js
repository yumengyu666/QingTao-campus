"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBanners = getBanners;
exports.createBanner = createBanner;
exports.updateBanner = updateBanner;
exports.deleteBanner = deleteBanner;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
// GET /api/banners — 获取轮播图列表
async function getBanners(_req, res, next) {
    try {
        const banners = await database_1.prisma.banner.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        return (0, response_1.success)(res, banners);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/admin/banners — 新增轮播图
async function createBanner(req, res, next) {
    try {
        const { imageUrl, linkUrl, sortOrder } = req.body;
        if (!imageUrl?.trim())
            return (0, response_1.error)(res, '请提供轮播图URL');
        const banner = await database_1.prisma.banner.create({
            data: {
                imageUrl: imageUrl.trim(),
                linkUrl: linkUrl || '',
                sortOrder: sortOrder || 0,
            },
        });
        return (0, response_1.success)(res, banner, '轮播图已添加', 201);
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/admin/banners/:id — 编辑轮播图
async function updateBanner(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的轮播图ID');
        const { imageUrl, linkUrl, sortOrder, isActive } = req.body;
        const banner = await database_1.prisma.banner.update({
            where: { id },
            data: {
                ...(imageUrl !== undefined && { imageUrl: imageUrl.trim() }),
                ...(linkUrl !== undefined && { linkUrl }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        return (0, response_1.success)(res, banner, '已更新');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/admin/banners/:id — 删除轮播图
async function deleteBanner(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的轮播图ID');
        await database_1.prisma.banner.delete({ where: { id } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=banner.controller.js.map