/**
 * 统一 HTTP 错误码枚举 + 中文消息
 * 所有 Controller 引用此枚举，避免硬编码数字
 */
export declare const ErrorCode: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly PAYLOAD_TOO_LARGE: 413;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL: 500;
};
export declare const ErrorMessage: Record<number, string>;
//# sourceMappingURL=errorCodes.d.ts.map