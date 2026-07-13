"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLostFoundList = getLostFoundList;
exports.createLostFound = createLostFound;
exports.getLostFoundDetail = getLostFoundDetail;
exports.updateLostFound = updateLostFound;
exports.deleteLostFound = deleteLostFound;
exports.resolveLostFound = resolveLostFound;
exports.getLostFoundComments = getLostFoundComments;
exports.createLostFoundComment = createLostFoundComment;
exports.deleteLostFoundComment = deleteLostFoundComment;
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const contact_1 = require("../utils/contact");
const notification_service_1 = require("../services/notification.service");
const images_1 = require("../utils/images");
const moderation_service_1 = require("../services/moderation.service");
const logger_1 = require("../utils/logger");
const lfSvc = __importStar(require("../services/lostfound.service"));
const viewDedup = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, t] of viewDedup) {
        if (now - t > 30 * 60 * 1000)
            viewDedup.delete(k);
    }
}, 10 * 60 * 1000).unref();
// GET /api/lostfound
async function getLostFoundList(req, res, next) {
    try {
        const q = req.query;
        const page = parseInt(q.page) || 1;
        const pageSize = Math.min(parseInt(q.pageSize) || 20, 50);
        const { list, total } = await lfSvc.findLostFoundList({ type: q.type, campusArea: q.campusArea, status: q.status, keyword: q.keyword, page, pageSize });
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/lostfound
async function createLostFound(req, res, next) {
    try {
        const { title, description, type, campusArea, images, location, lostTime, reward, contactName, wechat, qq, phone } = req.body;
        if ((0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (description && (0, sensitive_1.containsSensitive)(description))
            return (0, response_1.error)(res, '描述包含违规内容');
        const hasContact = await (0, contact_1.hasContactMethod)(req.user.userId);
        const contactHint = hasContact ? '' : '（建议填写联系方式）';
        const item = await lfSvc.createLostFound({ userId: req.user.userId, title: title.trim(), description, type, campusArea, images, location, lostTime, reward, contactName, wechat, qq, phone });
        await (0, images_1.linkImageReviews)(images, 'lostfound', item.id);
        const { afterCreate } = await Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware')));
        afterCreate('lostfound', item.id, req.user.userId, [{ field: 'title', text: title }, { field: 'description', text: description || '' }]);
        return (0, response_1.success)(res, item, `发布成功${contactHint}`, 201);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/lostfound/:id
async function getLostFoundDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的ID');
        const item = await lfSvc.findLostFoundById(id);
        if (!item)
            return (0, response_1.notFound)(res, '失物信息不存在');
        const isOwner = req.user?.userId === item.userId;
        const isAdmin = req.user?.role === 'admin';
        if (item.isDeleted && !isOwner && !isAdmin)
            return (0, response_1.notFound)(res, '失物信息不存在');
        if (!isOwner && !isAdmin && !['pending', 'resolved', 'approved'].includes(item.status))
            return (0, response_1.notFound)(res, '失物信息不存在');
        if (!isOwner) {
            const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
            const viewKey = `lf:${id}:${viewerIp}`;
            if (!viewDedup.has(viewKey)) {
                viewDedup.set(viewKey, Date.now());
                await lfSvc.incrementLostFoundView(id);
            }
        }
        return (0, response_1.success)(res, { ...item, images: JSON.parse(item.images || '[]') });
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/lostfound/:id
async function updateLostFound(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const item = await lfSvc.findLostFoundById(id);
        if (!item || item.isDeleted)
            return (0, response_1.notFound)(res, '失物信息不存在');
        if (item.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (req.body.title && (0, sensitive_1.containsSensitive)(req.body.title))
            return (0, response_1.error)(res, '标题包含违规内容');
        const updated = await lfSvc.updateLostFound(id, req.body);
        // 编辑后重新过 AI 审核（#87 补充：防止编辑绕过 L2 审核）
        const { afterCreate } = await Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware')));
        afterCreate('lostfound', updated.id, req.user.userId, [
            { field: 'title', text: updated.title },
            { field: 'description', text: updated.description || '' },
        ]);
        return (0, response_1.success)(res, updated, '修改成功');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/lostfound/:id
async function deleteLostFound(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const item = await lfSvc.findLostFoundById(id);
        if (!item || item.isDeleted)
            return (0, response_1.notFound)(res, '失物信息不存在');
        if (item.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await lfSvc.softDeleteLostFound(id);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/lostfound/:id/resolve
async function resolveLostFound(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const item = await lfSvc.findLostFoundById(id);
        if (!item || item.isDeleted)
            return (0, response_1.notFound)(res, '失物信息不存在');
        if (item.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (item.status === 'resolved')
            return (0, response_1.error)(res, '已标记为解决');
        await lfSvc.resolveLostFound(id);
        return (0, response_1.success)(res, null, '已标记为解决');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/lostfound/:id/comments
async function getLostFoundComments(req, res, next) {
    try {
        const itemId = parseInt(req.params.id);
        if (isNaN(itemId))
            return (0, response_1.error)(res, '无效的ID');
        const page = parseInt(req.query.page) || 1;
        const [list, total] = await lfSvc.findLostFoundComments(itemId, req.user?.userId, page);
        return (0, response_1.paginated)(res, list, total, page, 20);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/lostfound/:id/comments
async function createLostFoundComment(req, res, next) {
    try {
        const itemId = parseInt(req.params.id);
        if (isNaN(itemId))
            return (0, response_1.error)(res, '无效的ID');
        const { content } = req.body;
        if ((0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '评论包含违规内容');
        const item = await lfSvc.findLostFoundById(itemId);
        if (!item || item.isDeleted)
            return (0, response_1.notFound)(res, '失物信息不存在');
        const comment = await lfSvc.createLostFoundComment(itemId, req.user.userId, content.trim());
        if (item.userId !== req.user.userId) {
            (0, notification_service_1.createNotification)({ userId: item.userId, type: 'new_comment', title: '失物招领有新回复', content: `${req.user.username} 评论：${content.trim().substring(0, 50)}`, relatedId: itemId }).catch(() => { });
        }
        // L2 AI 异步审核评论内容
        (0, moderation_service_1.aiModerate)(content.trim(), { contentType: 'lostfound_comment', userId: req.user.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged lostfound comment #${comment.id}, deleting`);
                lfSvc.deleteLostFoundComment(comment.id).catch(() => { });
            }
        });
        return (0, response_1.success)(res, comment, '评论成功', 201);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/lostfound/:id/comments/:commentId
async function deleteLostFoundComment(req, res, next) {
    try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId))
            return (0, response_1.error)(res, '无效的评论ID');
        const comment = await lfSvc.findLostFoundCommentById(commentId);
        if (!comment)
            return (0, response_1.notFound)(res, '评论不存在');
        if (comment.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await lfSvc.deleteLostFoundComment(commentId);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=lostfound.controller.js.map