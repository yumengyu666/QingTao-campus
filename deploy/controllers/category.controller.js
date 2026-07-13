"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = getCategories;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
// GET /api/categories — 全部分类
async function getCategories(_req, res, next) {
    try {
        const categories = await database_1.prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
        });
        return (0, response_1.success)(res, categories);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=category.controller.js.map