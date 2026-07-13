/**
 * 统一分页工具
 * 所有 controller 通过此模块获取分页参数，确保默认值一致
 */
export declare const PAGINATION: {
    /** 默认每页条数 */
    readonly DEFAULT_PAGE_SIZE: 20;
    /** 最大每页条数（防止恶意请求） */
    readonly MAX_PAGE_SIZE: 100;
    /** 默认页码 */
    readonly DEFAULT_PAGE: 1;
};
/** 从 req.query 中安全解析分页参数 */
export declare function parsePagination(query: Record<string, any>): {
    page: number;
    pageSize: number;
};
/** 计算 Prisma 用的 skip/take */
export declare function paginationArgs(page: number, pageSize: number): {
    skip: number;
    take: number;
};
//# sourceMappingURL=pagination.d.ts.map