"use strict";
/**
 * 笔记/收藏夹/话题 Controller 层 — 只做参数提取 + 权限校验 + 响应格式化
 *
 * 业务逻辑已移入：
 *   - services/notes.service.ts      (笔记 CRUD + 互动)
 *   - services/collection.service.ts (收藏夹 CRUD)
 *   - services/tag.service.ts        (话题关注 + 动态流)
 *   - services/view-counter.service.ts (浏览量去重)
 */
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
exports.getNotes = getNotes;
exports.getNoteDetail = getNoteDetail;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
exports.getLikeStatus = getLikeStatus;
exports.toggleLikeNote = toggleLikeNote;
exports.saveNote = saveNote;
exports.unsaveNote = unsaveNote;
exports.shareNote = shareNote;
exports.getCollections = getCollections;
exports.createCollection = createCollection;
exports.updateCollection = updateCollection;
exports.deleteCollection = deleteCollection;
exports.getCollectionNotes = getCollectionNotes;
exports.followTag = followTag;
exports.unfollowTag = unfollowTag;
exports.getTagFeed = getTagFeed;
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const moderation_middleware_1 = require("../middleware/moderation.middleware");
const notesService = __importStar(require("../services/notes.service"));
const collectionService = __importStar(require("../services/collection.service"));
const tagService = __importStar(require("../services/tag.service"));
// ==================== 笔记 ====================
/** GET /api/notes — 笔记瀑布流 */
async function getNotes(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const sort = req.query.sort || 'recommend';
        const postType = req.query.postType;
        const tag = req.query.tag;
        const { list, total } = await notesService.findNotes({ page, pageSize, sort, postType, tag });
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/notes/:id — 笔记详情 */
async function getNoteDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的笔记ID');
        const detail = await notesService.findNoteDetail(id, req.user?.userId);
        if (!detail)
            return (0, response_1.notFound)(res, '笔记不存在');
        // 非作者/非管理员不可见待审核/被拒内容
        const { userId: detailUserId, status: detailStatus } = detail;
        const isOwner = req.user?.userId === detailUserId;
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin && detailStatus && ['pending', 'rejected'].includes(detailStatus)) {
            return (0, response_1.notFound)(res, '笔记不存在');
        }
        return (0, response_1.success)(res, detail);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/notes — 发布笔记 */
async function createNote(req, res, next) {
    try {
        const { title, content, images, postType, videoUrl, videoCover, videoDuration, location, tags } = req.body;
        // 基础校验
        if (!title?.trim())
            return (0, response_1.error)(res, '请输入笔记标题');
        if (title.length > 100)
            return (0, response_1.error)(res, '标题最多100字');
        if (content && content.length > 2000)
            return (0, response_1.error)(res, '内容最多2000字');
        // L1 敏感词检查
        if ((0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (content && (0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '内容包含违规内容');
        const note = await notesService.createNote({
            userId: req.user.userId,
            title,
            content,
            images,
            postType,
            videoUrl,
            videoCover,
            videoDuration,
            location,
            tags,
        });
        // L2 AI 审核（异步）
        (0, moderation_middleware_1.afterCreate)('post', note.id, req.user.userId, [
            { field: 'title', text: title },
            { field: 'content', text: content || '' },
        ]);
        return (0, response_1.success)(res, note, '已提交审核', 201);
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/notes/:id — 编辑笔记 */
async function updateNote(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的笔记ID');
        const { title, content, images, postType, location, tags } = req.body;
        if (title && (0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        const result = await notesService.updateNote({ id, userId: req.user.userId, title, content, images, postType, location, tags });
        if (result === 'not_found')
            return (0, response_1.notFound)(res, '笔记不存在');
        if (result === 'forbidden')
            return (0, response_1.error)(res, '无权操作', 403);
        return (0, response_1.success)(res, result, '修改成功');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/notes/:id — 软删除笔记 */
async function deleteNote(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的笔记ID');
        const result = await notesService.deleteNote(id, req.user.userId, req.user.role);
        if (result === 'not_found')
            return (0, response_1.notFound)(res, '笔记不存在');
        if (result === 'forbidden')
            return (0, response_1.error)(res, '无权操作', 403);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// ==================== 互动 ====================
/** GET /api/notes/:id/like/status — 点赞状态 */
async function getLikeStatus(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的笔记ID');
        const result = await notesService.getLikeStatus(postId, req.user.userId);
        return (0, response_1.success)(res, result);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/notes/:id/like — 点赞/取消 */
async function toggleLikeNote(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的笔记ID');
        const result = await notesService.toggleLike(postId, req.user.userId, req.user.username);
        return (0, response_1.success)(res, result);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/notes/:id/save — 收藏 */
async function saveNote(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的笔记ID');
        const result = await notesService.saveNote(postId, req.user.userId, req.body.collectionId);
        if (result === 'already_saved')
            return (0, response_1.error)(res, '已收藏');
        return (0, response_1.success)(res, null, '已收藏', 201);
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/notes/:id/save — 取消收藏 */
async function unsaveNote(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的笔记ID');
        const result = await notesService.unsaveNote(postId, req.user.userId);
        if (result === 'not_saved')
            return (0, response_1.error)(res, '未收藏');
        return (0, response_1.success)(res, null, '已取消收藏');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/notes/:id/share — 分享计数 */
async function shareNote(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的笔记ID');
        await notesService.incrementShare(postId);
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
// ==================== 收藏夹 ====================
/** GET /api/collections — 我的收藏夹列表 */
async function getCollections(req, res, next) {
    try {
        const data = await collectionService.findCollections({ userId: req.user.userId });
        return (0, response_1.success)(res, data);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/collections — 创建收藏夹 */
async function createCollection(req, res, next) {
    try {
        const { name, isPublic, coverUrl } = req.body;
        if (!name?.trim())
            return (0, response_1.error)(res, '请输入收藏夹名称');
        if (name.length > 20)
            return (0, response_1.error)(res, '名称最多20字');
        const col = await collectionService.createCollection({
            userId: req.user.userId,
            name,
            isPublic,
            coverUrl,
        });
        return (0, response_1.success)(res, col, '创建成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/collections/:id — 编辑收藏夹 */
async function updateCollection(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的收藏夹ID');
        const result = await collectionService.updateCollection({
            id,
            userId: req.user.userId,
            name: req.body.name,
            isPublic: req.body.isPublic,
            coverUrl: req.body.coverUrl,
        });
        if (result === 'not_found')
            return (0, response_1.notFound)(res, '收藏夹不存在');
        if (result === 'forbidden')
            return (0, response_1.error)(res, '无权操作', 403);
        return (0, response_1.success)(res, result.data);
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/collections/:id — 删除收藏夹 */
async function deleteCollection(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的收藏夹ID');
        const result = await collectionService.deleteCollection(id, req.user.userId);
        if (result === 'not_found')
            return (0, response_1.notFound)(res, '收藏夹不存在');
        if (result === 'forbidden')
            return (0, response_1.error)(res, '无权操作', 403);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/collections/:id/notes — 收藏夹内笔记 */
async function getCollectionNotes(req, res, next) {
    try {
        const collectionId = parseInt(req.params.id);
        if (isNaN(collectionId))
            return (0, response_1.error)(res, '无效的收藏夹ID');
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const { list, total } = await collectionService.findCollectionNotes({ collectionId, page, pageSize });
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// ==================== 话题 ====================
/** POST /api/tags/:id/follow — 关注话题 */
async function followTag(req, res, next) {
    try {
        const tagId = parseInt(req.params.id);
        if (isNaN(tagId))
            return (0, response_1.error)(res, '无效的话题ID');
        await tagService.followTag(tagId, req.user.userId);
        return (0, response_1.success)(res, null, '已关注');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/tags/:id/follow — 取消关注 */
async function unfollowTag(req, res, next) {
    try {
        const tagId = parseInt(req.params.id);
        if (isNaN(tagId))
            return (0, response_1.error)(res, '无效的话题ID');
        await tagService.unfollowTag(tagId, req.user.userId);
        return (0, response_1.success)(res, null, '已取消关注');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/tags/:name/feed — 话题动态流 */
async function getTagFeed(req, res, next) {
    try {
        const tagName = req.params.name;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const { list, total } = await tagService.findFeedByTag({ tagName, page });
        return (0, response_1.paginated)(res, list, total, page, 20);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=notes.controller.js.map