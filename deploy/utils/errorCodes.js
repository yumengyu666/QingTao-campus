"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessage = exports.ErrorCode = void 0;
/**
 * 统一 HTTP 错误码枚举 + 中文消息
 * 所有 Controller 引用此枚举，避免硬编码数字
 */
exports.ErrorCode = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    TOO_MANY_REQUESTS: 429,
    INTERNAL: 500,
};
exports.ErrorMessage = {
    400: '请求参数有误',
    401: '请先登录',
    403: '无权访问',
    404: '资源不存在',
    409: '数据冲突，请勿重复操作',
    413: '文件大小超过限制',
    429: '请求过于频繁，请稍后再试',
    500: '服务器内部错误',
};
//# sourceMappingURL=errorCodes.js.map