import { prisma } from '../config/database';

/** 关联图片审核记录到内容（商品/帖子/失物） */
export async function linkImageReviews(images: any, context: string, contextId: number) {
  if (!Array.isArray(images)) return;
  const reviewIds = images.filter((img: any) => img?.reviewId).map((img: any) => img.reviewId);
  if (reviewIds.length > 0) {
    await prisma.imageReview.updateMany({
      where: { id: { in: reviewIds } },
      data: { context, contextId },
    });
  }
}
