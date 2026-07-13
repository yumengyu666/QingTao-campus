"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressImage = compressImage;
exports.compressBannerImage = compressBannerImage;
exports.createBlurredImage = createBlurredImage;
const sharp_1 = __importDefault(require("sharp"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/** 压缩原图 → 800px WebP (80% quality) — 普通用户内容 */
async function compressImage(filePath) {
    const outputPath = filePath;
    const tempPath = filePath + '.tmp';
    try {
        await (0, sharp_1.default)(filePath)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(tempPath);
        await promises_1.default.unlink(filePath);
        await promises_1.default.rename(tempPath, outputPath);
    }
    catch {
        try {
            await promises_1.default.unlink(tempPath);
        }
        catch { /* ignore */ }
    }
    return '/' + path_1.default.relative(path_1.default.resolve('.'), filePath).replace(/\\/g, '/');
}
/** 压缩轮播图 → 1920px WebP (90% quality) — 轻度压缩，保留细节 */
async function compressBannerImage(filePath) {
    const outputPath = filePath;
    const tempPath = filePath + '.tmp';
    try {
        await (0, sharp_1.default)(filePath)
            .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 90 })
            .toFile(tempPath);
        await promises_1.default.unlink(filePath);
        await promises_1.default.rename(tempPath, outputPath);
    }
    catch {
        try {
            await promises_1.default.unlink(tempPath);
        }
        catch { /* ignore */ }
    }
    return '/' + path_1.default.relative(path_1.default.resolve('.'), filePath).replace(/\\/g, '/');
}
/** 生成模糊版: 50px + 高斯模糊 + 极低质量 */
async function createBlurredImage(filePath) {
    const dir = path_1.default.dirname(filePath);
    const baseName = path_1.default.basename(filePath, '.webp');
    const blurredPath = path_1.default.join(dir, `${baseName}_blur.webp`);
    try {
        await (0, sharp_1.default)(filePath)
            .resize(50, 50, { fit: 'inside' })
            .blur(8)
            .webp({ quality: 20 })
            .toFile(blurredPath);
    }
    catch {
        try {
            await (0, sharp_1.default)(filePath).resize(30, 30, { fit: 'inside' }).webp({ quality: 10 }).toFile(blurredPath);
        }
        catch { /* ignore */ }
    }
    return '/' + path_1.default.relative(path_1.default.resolve('.'), blurredPath).replace(/\\/g, '/');
}
//# sourceMappingURL=upload.service.js.map