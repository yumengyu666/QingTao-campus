import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

// GET /api/banners — 获取轮播图列表
export async function getBanners(_req: Request, res: Response, next: NextFunction) {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return success(res, banners);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/banners — 新增轮播图
export async function createBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const { imageUrl, linkUrl, sortOrder } = req.body;
    if (!imageUrl?.trim()) return error(res, '请提供轮播图URL');

    const banner = await prisma.banner.create({
      data: {
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl || '',
        sortOrder: sortOrder || 0,
      },
    });

    return success(res, banner, '轮播图已添加', 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/banners/:id — 编辑轮播图
export async function updateBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的轮播图ID');
    const { imageUrl, linkUrl, sortOrder, isActive } = req.body;

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(imageUrl !== undefined && { imageUrl: imageUrl.trim() }),
        ...(linkUrl !== undefined && { linkUrl }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return success(res, banner, '已更新');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/banners/:id — 删除轮播图
export async function deleteBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的轮播图ID');
    await prisma.banner.delete({ where: { id } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}
