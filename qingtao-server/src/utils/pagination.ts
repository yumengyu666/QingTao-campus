/**
 * 统一分页工具
 * 所有 controller 通过此模块获取分页参数，确保默认值一致
 */

export const PAGINATION = {
  /** 默认每页条数 */
  DEFAULT_PAGE_SIZE: 20,
  /** 最大每页条数（防止恶意请求） */
  MAX_PAGE_SIZE: 100,
  /** 默认页码 */
  DEFAULT_PAGE: 1,
} as const;

/** 从 req.query 中安全解析分页参数 */
export function parsePagination(query: Record<string, any>): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query.page as string) || PAGINATION.DEFAULT_PAGE);
  const pageSize = Math.min(
    Math.max(1, parseInt(query.pageSize as string) || PAGINATION.DEFAULT_PAGE_SIZE),
    PAGINATION.MAX_PAGE_SIZE,
  );
  return { page, pageSize };
}

/** 计算 Prisma 用的 skip/take */
export function paginationArgs(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
