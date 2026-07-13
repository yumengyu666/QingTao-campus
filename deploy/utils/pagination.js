"use strict";
/**
 * 统一分页工具
 * 所有 controller 通过此模块获取分页参数，确保默认值一致
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION = void 0;
exports.parsePagination = parsePagination;
exports.paginationArgs = paginationArgs;
exports.PAGINATION = {
    /** 默认每页条数 */
    DEFAULT_PAGE_SIZE: 20,
    /** 最大每页条数（防止恶意请求） */
    MAX_PAGE_SIZE: 100,
    /** 默认页码 */
    DEFAULT_PAGE: 1,
};
/** 从 req.query 中安全解析分页参数 */
function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || exports.PAGINATION.DEFAULT_PAGE);
    const pageSize = Math.min(Math.max(1, parseInt(query.pageSize) || exports.PAGINATION.DEFAULT_PAGE_SIZE), exports.PAGINATION.MAX_PAGE_SIZE);
    return { page, pageSize };
}
/** 计算 Prisma 用的 skip/take */
function paginationArgs(page, pageSize) {
    return {
        skip: (page - 1) * pageSize,
        take: pageSize,
    };
}
//# sourceMappingURL=pagination.js.map