/**
 * 分页参数统一解析工具
 * 所有列表接口共用，保证 page/pageSize 行为一致
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePagination(query: Record<string, any>, defaults?: { pageSize?: number; maxPageSize?: number }): PaginationParams {
  const defaultSize = defaults?.pageSize ?? 20;
  const maxSize = defaults?.maxPageSize ?? 100;

  let page = parseInt(query.page as string) || 1;
  let pageSize = parseInt(query.pageSize as string) || defaultSize;

  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = defaultSize;
  if (pageSize > maxSize) pageSize = maxSize;

  return { page, pageSize, skip: (page - 1) * pageSize };
}
