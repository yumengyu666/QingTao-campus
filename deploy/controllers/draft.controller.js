"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDraft = saveDraft;
exports.getDraft = getDraft;
exports.deleteDraft = deleteDraft;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/**
 * POST /api/drafts — 保存草稿
 */
async function saveDraft(req, res, next) {
    try {
        const { type, data } = req.body; // type: goods|post|lostfound, data: JSON
        if (!type || !data)
            return (0, response_1.error)(res, '参数不完整');
        const existing = await database_1.prisma.draft.findFirst({
            where: { userId: req.user.userId, type },
        });
        if (existing) {
            await database_1.prisma.draft.update({
                where: { id: existing.id },
                data: { data: JSON.stringify(data) },
            });
        }
        else {
            await database_1.prisma.draft.create({
                data: { userId: req.user.userId, type, data: JSON.stringify(data) },
            });
        }
        return (0, response_1.success)(res, null, '草稿已保存');
    }
    catch (err) {
        next(err);
    }
}
/**
 * GET /api/drafts/:type — 获取草稿
 */
async function getDraft(req, res, next) {
    try {
        const type = req.params.type;
        const draft = await database_1.prisma.draft.findFirst({
            where: { userId: req.user.userId, type },
        });
        if (!draft)
            return (0, response_1.success)(res, null);
        let data;
        try {
            data = JSON.parse(draft.data);
        }
        catch {
            data = {};
        }
        return (0, response_1.success)(res, { id: draft.id, type: draft.type, data, updatedAt: draft.updatedAt });
    }
    catch (err) {
        next(err);
    }
}
/**
 * DELETE /api/drafts/:type — 删除草稿
 */
async function deleteDraft(req, res, next) {
    try {
        const type = req.params.type;
        await database_1.prisma.draft.deleteMany({ where: { userId: req.user.userId, type } });
        return (0, response_1.success)(res, null, '草稿已删除');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=draft.controller.js.map