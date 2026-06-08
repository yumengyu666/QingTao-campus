import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success } from '../utils/response';

/** GET /api/badges — 我的徽章 */
export async function getMyBadges(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const badgeIds = userBadges.map(ub => ub.badgeId);
    const badges = badgeIds.length > 0 ? await prisma.badge.findMany({
      where: { id: { in: badgeIds } },
      select: { id: true, name: true, icon: true, description: true },
    }) : [];

    const badgeMap = new Map(badges.map(b => [b.id, b]));
    return success(res, userBadges.map(ub => badgeMap.get(ub.badgeId) || null).filter(Boolean));
  } catch (err) { next(err); }
}

/** GET /api/badges/all — 所有可用徽章 */
export async function getAllBadges(_req: Request, res: Response, next: NextFunction) {
  try {
    const badges = await prisma.badge.findMany({ orderBy: { id: 'asc' } });
    return success(res, badges);
  } catch (err) { next(err); }
}
