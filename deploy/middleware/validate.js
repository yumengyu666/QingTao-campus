"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
function validate(schema) {
    return (req, res, next) => {
        try {
            // 兼容旧版单 schema 用法（默认校验 body）
            // Zod 4 的 ZodSchema 是类型，用 typeof schema.parse 判断
            if (typeof schema.parse === 'function' && !('body' in schema) && !('query' in schema)) {
                req.body = schema.parse(req.body);
                next();
                return;
            }
            // 新版多 schema 用法
            const schemas = schema;
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const errors = err.issues.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return res.status(400).json({
                    code: 400,
                    message: '请求参数有误',
                    errors,
                    data: null,
                });
            }
            next(err);
        }
    };
}
// 便捷函数：仅校验 query 参数
function validateQuery(schema) {
    return validate({ query: schema });
}
// 便捷函数：仅校验 params 参数
function validateParams(schema) {
    return validate({ params: schema });
}
//# sourceMappingURL=validate.js.map