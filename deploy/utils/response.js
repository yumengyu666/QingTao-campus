"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.paginated = paginated;
exports.error = error;
exports.serverError = serverError;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
function success(res, data, message = 'success', code = 200) {
    return res.status(code).json({ code, message, data });
}
function paginated(res, list, total, page, pageSize) {
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
function error(res, message, code = 400) {
    return res.status(code).json({ code, message, data: null });
}
function serverError(res, message = '服务器内部错误') {
    return res.status(500).json({ code: 500, message, data: null });
}
function unauthorized(res, message = '未登录或登录已过期') {
    return res.status(401).json({ code: 401, message, data: null });
}
function forbidden(res, message = '无权访问') {
    return res.status(403).json({ code: 403, message, data: null });
}
function notFound(res, message = '资源不存在') {
    return res.status(404).json({ code: 404, message, data: null });
}
//# sourceMappingURL=response.js.map