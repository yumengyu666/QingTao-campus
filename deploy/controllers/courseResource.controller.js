"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResources = getResources;
exports.getResource = getResource;
exports.createResource = createResource;
exports.updateResource = updateResource;
exports.deleteResource = deleteResource;
exports.downloadResource = downloadResource;
exports.toggleLike = toggleLike;
exports.reportResource = reportResource;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const moderation_service_1 = require("../services/moderation.service");
const logger_1 = require("../utils/logger");
const VALID_TYPES = ['exam', 'note', 'mindmap', 'report', 'other'];
/** GET /api/resources — 列表（热门前排，不返回 fileUrl） */
async function getResources(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const { courseName, type, sort } = req.query;
        const where = {};
        if (courseName)
            where.courseName = { contains: String(courseName) };
        if (type && VALID_TYPES.includes(String(type)))
            where.type = String(type);
        // 排序：hot（下载量）| newest（最新）
        const orderBy = sort === 'newest' ? { createdAt: 'desc' } : { downloadCount: 'desc' };
        const [list, total] = await Promise.all([
            database_1.prisma.courseResource.findMany({
                where,
                select: {
                    id: true, courseName: true, courseCode: true, title: true, type: true,
                    description: true, fileSize: true, downloadCount: true, likeCount: true,
                    createdAt: true, userId: true,
                    user: { select: { id: true, nickname: true, avatarUrl: true } },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy,
            }),
            database_1.prisma.courseResource.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/resources/:id — 详情（返回 fileUrl 并 +1 下载数） */
async function getResource(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的资料ID');
        const resource = await database_1.prisma.courseResource.findUnique({
            where: { id },
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        });
        if (!resource)
            return (0, response_1.error)(res, '资料不存在', 404);
        // 下载数+1（原子操作，不阻塞返回）
        database_1.prisma.courseResource.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        }).catch(() => { });
        return (0, response_1.success)(res, resource);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/resources — 上传资料（需登录） */
async function createResource(req, res, next) {
    try {
        const userId = req.user.userId;
        const { courseName, courseCode, title, type, description, fileUrl, fileSize } = req.body;
        if (!courseName?.trim())
            return (0, response_1.error)(res, '请输入课程名称');
        if (!title?.trim())
            return (0, response_1.error)(res, '请输入资料标题');
        if (!fileUrl)
            return (0, response_1.error)(res, '请上传文件');
        if (title.length > 100)
            return (0, response_1.error)(res, '标题最多 100 字');
        if (description?.length > 500)
            return (0, response_1.error)(res, '描述最多 500 字');
        // L1 敏感词检查
        if ((0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (description && (0, sensitive_1.containsSensitive)(description))
            return (0, response_1.error)(res, '描述包含违规内容');
        if ((0, sensitive_1.containsSensitive)(courseName))
            return (0, response_1.error)(res, '课程名包含违规内容');
        const finalType = type && VALID_TYPES.includes(type) ? type : 'other';
        const resource = await database_1.prisma.courseResource.create({
            data: {
                userId,
                courseName: courseName.trim(),
                courseCode: (courseCode || '').trim(),
                title: title.trim(),
                type: finalType,
                description: description?.trim() || '',
                fileUrl,
                fileSize: fileSize || null,
            },
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        });
        // L2 AI 异步审核（fire-and-forget）
        const textToReview = [title, description, courseName].filter(Boolean).join(' ');
        if (textToReview.trim()) {
            (0, moderation_service_1.aiModerate)(textToReview.trim(), { contentType: 'courseResource', userId }).then(result => {
                if (result === 'violation') {
                    logger_1.logger.warn(`AI flagged courseResource #${resource.id}, would need manual review`);
                }
            });
        }
        return (0, response_1.success)(res, resource, '上传成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/resources/:id — 编辑资料元数据（仅上传者本人） */
async function updateResource(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的资料ID');
        const userId = req.user.userId;
        const { courseName, courseCode, title, type, description } = req.body;
        const resource = await database_1.prisma.courseResource.findUnique({ where: { id } });
        if (!resource)
            return (0, response_1.error)(res, '资料不存在', 404);
        if (resource.userId !== userId)
            return (0, response_1.error)(res, '无权编辑', 403);
        if (title && title.length > 100)
            return (0, response_1.error)(res, '标题最多 100 字');
        if (description && description.length > 500)
            return (0, response_1.error)(res, '描述最多 500 字');
        const data = {};
        if (courseName !== undefined)
            data.courseName = String(courseName).trim();
        if (courseCode !== undefined)
            data.courseCode = String(courseCode).trim();
        if (title !== undefined)
            data.title = String(title).trim();
        if (type && VALID_TYPES.includes(type))
            data.type = type;
        if (description !== undefined)
            data.description = String(description).trim();
        const updated = await database_1.prisma.courseResource.update({
            where: { id },
            data,
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        });
        return (0, response_1.success)(res, updated, '修改成功');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/resources/:id — 删除（上传者本人或管理员） */
async function deleteResource(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的资料ID');
        const userId = req.user.userId;
        const isAdmin = req.user.role === 'admin';
        const resource = await database_1.prisma.courseResource.findUnique({ where: { id } });
        if (!resource)
            return (0, response_1.error)(res, '资料不存在', 404);
        if (!isAdmin && resource.userId !== userId)
            return (0, response_1.error)(res, '无权删除', 403);
        await database_1.prisma.courseResource.delete({ where: { id } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/resources/:id/download — 下载计数+1（原子操作，返回 fileUrl） */
async function downloadResource(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的资料ID');
        const resource = await database_1.prisma.courseResource.findUnique({
            where: { id },
            select: { id: true, fileUrl: true },
        });
        if (!resource)
            return (0, response_1.error)(res, '资料不存在', 404);
        // 原子递增下载数
        await database_1.prisma.courseResource.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        });
        return (0, response_1.success)(res, { fileUrl: resource.fileUrl }, 'ok');
    }
    catch (err) {
        next(err);
    }
}
// 简单的点赞防刷 Map（同 treehole）
const resourceLikeCache = new Map();
setInterval(() => resourceLikeCache.clear(), 30 * 60 * 1000);
/** POST /api/resources/:id/like — 点赞/取消赞 */
async function toggleLike(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的资料ID');
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `${clientIp}:${id}`;
        const resource = await database_1.prisma.courseResource.findUnique({ where: { id } });
        if (!resource)
            return (0, response_1.error)(res, '资料不存在', 404);
        if (resourceLikeCache.has(key)) {
            resourceLikeCache.delete(key);
            await database_1.prisma.courseResource.update({ where: { id }, data: { likeCount: Math.max(0, resource.likeCount - 1) } });
            return (0, response_1.success)(res, { liked: false, likeCount: Math.max(0, resource.likeCount - 1) }, '已取消赞');
        }
        resourceLikeCache.set(key, Date.now());
        await database_1.prisma.courseResource.update({ where: { id }, data: { likeCount: { increment: 1 } } });
        return (0, response_1.success)(res, { liked: true, likeCount: resource.likeCount + 1 }, '点赞成功');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/resources/:id/report — 举报资料（#41，虚假/过时资料） */
async function reportResource(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的资料ID');
        const { reason } = req.body;
        const resource = await database_1.prisma.courseResource.findUnique({ where: { id } });
        if (!resource)
            return (0, response_1.error)(res, '资料不存在', 404);
        if (!reason?.trim())
            return (0, response_1.error)(res, '请填写举报原因');
        if (reason.length > 500)
            return (0, response_1.error)(res, '举报原因最多500字');
        // 去重：同一用户对同一资料24小时内不重复举报
        const recent = await database_1.prisma.report.findFirst({
            where: {
                reporterId: req.user.userId,
                targetType: 'resource',
                targetId: id,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
        });
        if (recent)
            return (0, response_1.error)(res, '你已在24小时内举报过该资料');
        await database_1.prisma.report.create({
            data: {
                reporterId: req.user.userId,
                targetType: 'resource',
                targetId: id,
                reason: reason.trim(),
            },
        });
        return (0, response_1.success)(res, null, '举报已提交，管理员会尽快处理');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=courseResource.controller.js.map