import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

type ReviewTargetType = 'goods' | 'posts' | 'lostfound' | 'profile' | 'goods_comment' | 'post_comment' | 'lostfound_comment';

interface ReviewResult {
  id: number;
  type: ReviewTargetType;
  status: string;
}

// 通过审核
export async function approveReview(type: ReviewTargetType, id: number, reviewerId: number): Promise<ReviewResult> {
  return prisma.$transaction(async (tx) => {
    let userId: number;
    let title: string;

    switch (type) {
      case 'goods': {
        const item = await tx.goods.update({
          where: { id },
          data: { status: 'approved', reviewedBy: reviewerId, reviewComment: '', updatedAt: new Date() },
        });
        userId = item.userId;
        title = item.title;
        break;
      }
      case 'posts': {
        const item = await tx.post.update({
          where: { id },
          data: { status: 'approved', reviewedBy: reviewerId, reviewComment: '', updatedAt: new Date() },
        });
        userId = item.userId;
        title = item.title;
        break;
      }
      case 'lostfound': {
        const item = await tx.lostFound.update({
          where: { id },
          data: { status: 'approved', reviewedBy: reviewerId, reviewComment: '', updatedAt: new Date() },
        });
        userId = item.userId;
        title = item.title;
        break;
      }
      case 'profile': {
        const change = await tx.profileChange.findUnique({ where: { id } });
        if (!change) throw new Error('ProfileChange not found');
        await tx.user.update({
          where: { id: change.userId },
          data: { [change.fieldName]: change.newValue },
        });
        await tx.profileChange.update({
          where: { id },
          data: { status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() },
        });
        userId = change.userId;
        title = change.fieldName;
        break;
      }
      case 'goods_comment': {
        const item = await tx.goodsComment.update({
          where: { id },
          data: { status: 'approved', reviewComment: '' },
        });
        userId = item.userId;
        title = item.content.substring(0, 30);
        break;
      }
      case 'post_comment': {
        const item = await tx.postComment.update({
          where: { id },
          data: { status: 'approved', reviewComment: '' },
        });
        userId = item.userId;
        title = item.content.substring(0, 30);
        break;
      }
      case 'lostfound_comment': {
        const item = await tx.lostFoundComment.update({
          where: { id },
          data: { status: 'approved', reviewComment: '' },
        });
        userId = item.userId;
        title = item.content.substring(0, 30);
        break;
      }
      default:
        throw new Error(`Unknown review type: ${type}`);
    }

    await createReviewNotificationTx(tx, userId, type, title, 'approved', '');
    logger.info(`Review APPROVED: type=${type} id=${id} by admin=${reviewerId}`);

    return { id, type, status: 'approved' };
  });
}

// 拒绝审核
export async function rejectReview(type: ReviewTargetType, id: number, reviewerId: number, reason: string): Promise<ReviewResult> {
  return prisma.$transaction(async (tx) => {
    let userId: number;
    let title: string;

    switch (type) {
      case 'goods': {
        const item = await tx.goods.update({
          where: { id },
          data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, updatedAt: new Date() },
        });
        userId = item.userId;
        title = item.title;
        break;
      }
      case 'posts': {
        const item = await tx.post.update({
          where: { id },
          data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, updatedAt: new Date() },
        });
        userId = item.userId;
        title = item.title;
        break;
      }
      case 'lostfound': {
        const item = await tx.lostFound.update({
          where: { id },
          data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, updatedAt: new Date() },
        });
        userId = item.userId;
        title = item.title;
        break;
      }
      case 'profile': {
        const change = await tx.profileChange.update({
          where: { id },
          data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, reviewedAt: new Date() },
        });
        userId = change.userId;
        title = change.fieldName;
        break;
      }
      case 'goods_comment': {
        const item = await tx.goodsComment.update({
          where: { id },
          data: { status: 'rejected', reviewComment: reason },
        });
        userId = item.userId;
        title = item.content.substring(0, 30);
        break;
      }
      case 'post_comment': {
        const item = await tx.postComment.update({
          where: { id },
          data: { status: 'rejected', reviewComment: reason },
        });
        userId = item.userId;
        title = item.content.substring(0, 30);
        break;
      }
      case 'lostfound_comment': {
        const item = await tx.lostFoundComment.update({
          where: { id },
          data: { status: 'rejected', reviewComment: reason },
        });
        userId = item.userId;
        title = item.content.substring(0, 30);
        break;
      }
      default:
        throw new Error(`Unknown review type: ${type}`);
    }

    await createReviewNotificationTx(tx, userId, type, title, 'rejected', reason);
    logger.info(`Review REJECTED: type=${type} id=${id} by admin=${reviewerId}, reason=${reason}`);

    return { id, type, status: 'rejected' };
  });
}

// 审核通知（事务内版本）
async function createReviewNotificationTx(
  tx: Prisma.TransactionClient,
  userId: number,
  contentType: string,
  itemTitle: string,
  result: string,
  reason: string,
) {
  const labels: Record<string, string> = {
    goods: '商品',
    posts: '帖子',
    lostfound: '失物招领',
    profile: '个人资料',
    goods_comment: '商品评论',
    post_comment: '帖子评论',
    lostfound_comment: '失物招领评论',
  };
  const label = labels[contentType] || contentType;

  await tx.notification.create({
    data: {
      userId,
      type: 'review_result',
      title: `你的${label}"${itemTitle.substring(0, 30)}"审核${result === 'approved' ? '通过' : '未通过'}`,
      content: result === 'rejected' ? `原因：${reason}` : '',
    },
  });
}
