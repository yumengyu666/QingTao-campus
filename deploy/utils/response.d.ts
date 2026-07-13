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
export declare function success<T>(res: Response, data: T, message?: string, code?: number): Response<any, Record<string, any>>;
export declare function paginated<T>(res: Response, list: T[], total: number, page: number, pageSize: number): Response<any, Record<string, any>>;
export declare function error(res: Response, message: string, code?: number): Response<any, Record<string, any>>;
export declare function serverError(res: Response, message?: string): Response<any, Record<string, any>>;
export declare function unauthorized(res: Response, message?: string): Response<any, Record<string, any>>;
export declare function forbidden(res: Response, message?: string): Response<any, Record<string, any>>;
export declare function notFound(res: Response, message?: string): Response<any, Record<string, any>>;
//# sourceMappingURL=response.d.ts.map