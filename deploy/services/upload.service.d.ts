/** 压缩原图 → 800px WebP (80% quality) — 普通用户内容 */
export declare function compressImage(filePath: string): Promise<string>;
/** 压缩轮播图 → 1920px WebP (90% quality) — 轻度压缩，保留细节 */
export declare function compressBannerImage(filePath: string): Promise<string>;
/** 生成模糊版: 50px + 高斯模糊 + 极低质量 */
export declare function createBlurredImage(filePath: string): Promise<string>;
//# sourceMappingURL=upload.service.d.ts.map