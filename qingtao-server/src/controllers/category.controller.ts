import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success } from '../utils/response';

// GET /api/categories — 全部分类
export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return success(res, categories);
  } catch (err) {
    next(err);
  }
}
