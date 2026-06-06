import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function success<T>(res: Response, data: T, message = 'success', code = 200) {
  return res.status(code).json({ code, message, data });
}

export function paginated<T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return res.status(200).json({
    code: 200,
    message: 'success',
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export function error(res: Response, message: string, code = 400) {
  return res.status(code).json({ code, message, data: null });
}

export function serverError(res: Response, message = '服务器内部错误') {
  return res.status(500).json({ code: 500, message, data: null });
}

export function unauthorized(res: Response, message = '未登录或登录已过期') {
  return res.status(401).json({ code: 401, message, data: null });
}

export function forbidden(res: Response, message = '无权访问') {
  return res.status(403).json({ code: 403, message, data: null });
}

export function notFound(res: Response, message = '资源不存在') {
  return res.status(404).json({ code: 404, message, data: null });
}
