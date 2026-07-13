"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTags = getTags;
exports.getPostsByTag = getPostsByTag;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/** GET /api/tags — 热门标签列表 */
async function getTags(_req, res, next) {
    try {
        const tags = await database_1.prisma.topicTag.findMany({
            orderBy: { postCount: 'desc' },
            take: 30,
        });
        return (0, response_1.success)(res, tags);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/tags/:name/posts — 标签下的帖子 */
async function getPostsByTag(req, res, next) {
    try {
        const name = String(req.params.name || '');
        const page = Math.max(parseInt(String(req.query.page || '1')), 1);
        const pageSize = 20;
        const tag = await database_1.prisma.topicTag.findUnique({ where: { name } });
        if (!tag)
            return (0, response_1.paginated)(res, [], 0, page, pageSize);
        const [postTags, total] = await Promise.all([
            database_1.prisma.postTag.findMany({
                where: { tagId: tag.id },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { id: 'desc' },
            }),
            database_1.prisma.postTag.count({ where: { tagId: tag.id } }),
        ]);
        const postIds = postTags.map(pt => pt.postId);
        const posts = await database_1.prisma.post.findMany({
            where: { id: { in: postIds }, isDeleted: false },
            select: { id: true, title: true, content: true, images: true, createdAt: true, user: { select: { id: true, nickname: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return (0, response_1.paginated)(res, posts, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=tag.controller.js.map