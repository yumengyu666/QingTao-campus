"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkImageReviews = linkImageReviews;
const database_1 = require("../config/database");
/** 关联图片审核记录到内容（商品/帖子/失物） */
async function linkImageReviews(images, context, contextId) {
    if (!Array.isArray(images))
        return;
    const reviewIds = images.filter((img) => img?.reviewId).map((img) => img.reviewId);
    if (reviewIds.length > 0) {
        await database_1.prisma.imageReview.updateMany({
            where: { id: { in: reviewIds } },
            data: { context, contextId },
        });
    }
}
//# sourceMappingURL=images.js.map