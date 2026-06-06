import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/** 压缩原图 → 800px WebP (80% quality) — 普通用户内容 */
export async function compressImage(filePath: string): Promise<string> {
  const outputPath = filePath;
  const tempPath = filePath + '.tmp';
  try {
    await sharp(filePath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(tempPath);
    await fs.unlink(filePath);
    await fs.rename(tempPath, outputPath);
  } catch {
    try { await fs.unlink(tempPath); } catch { /* ignore */ }
  }
  return '/' + path.relative(path.resolve('.'), filePath).replace(/\\/g, '/');
}

/** 压缩轮播图 → 1920px WebP (90% quality) — 轻度压缩，保留细节 */
export async function compressBannerImage(filePath: string): Promise<string> {
  const outputPath = filePath;
  const tempPath = filePath + '.tmp';
  try {
    await sharp(filePath)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(tempPath);
    await fs.unlink(filePath);
    await fs.rename(tempPath, outputPath);
  } catch {
    try { await fs.unlink(tempPath); } catch { /* ignore */ }
  }
  return '/' + path.relative(path.resolve('.'), filePath).replace(/\\/g, '/');
}

/** 生成模糊版: 50px + 高斯模糊 + 极低质量 */
export async function createBlurredImage(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, '.webp');
  const blurredPath = path.join(dir, `${baseName}_blur.webp`);
  try {
    await sharp(filePath)
      .resize(50, 50, { fit: 'inside' })
      .blur(8)
      .webp({ quality: 20 })
      .toFile(blurredPath);
  } catch {
    try {
      await sharp(filePath).resize(30, 30, { fit: 'inside' }).webp({ quality: 10 }).toFile(blurredPath);
    } catch { /* ignore */ }
  }
  return '/' + path.relative(path.resolve('.'), blurredPath).replace(/\\/g, '/');
}
