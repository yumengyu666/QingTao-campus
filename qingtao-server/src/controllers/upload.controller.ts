import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { compressImage, compressBannerImage, createBlurredImage } from '../services/upload.service';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';

// 文件魔术字校验 — 防止改扩展名绕过
const MAGIC_BYTES: Record<string, number[][]> = {
  pdf:   [[0x25, 0x50, 0x44, 0x46]],
  doc:   [[0xD0, 0xCF, 0x11, 0xE0]],
  docx:  [[0x50, 0x4B, 0x03, 0x04]],
  xls:   [[0xD0, 0xCF, 0x11, 0xE0]],
  xlsx:  [[0x50, 0x4B, 0x03, 0x04]],
  ppt:   [[0xD0, 0xCF, 0x11, 0xE0]],
  pptx:  [[0x50, 0x4B, 0x03, 0x04]],
  zip:   [[0x50, 0x4B, 0x03, 0x04]],
  rar:   [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]],
  '7z':  [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]],
  txt:   [[]], // 纯文本无魔术字，跳过校验
  md:    [[]],
  csv:   [[]],
};

// 图片魔术字节
const IMAGE_MAGIC: Record<string, number[][]> = {
  jpg:  [[0xFF, 0xD8, 0xFF]],
  jpeg: [[0xFF, 0xD8, 0xFF]],
  png:  [[0x89, 0x50, 0x4E, 0x47]],
  gif:  [[0x47, 0x49, 0x46, 0x38]],
  bmp:  [[0x42, 0x4D]],
  webp: [[0x52, 0x49, 0x46, 0x46]],  // RIFF + 偏移8位 WEBP
};

function validateMagicBytes(filePath: string, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures || signatures.length === 0 || (signatures.length === 1 && signatures[0].length === 0)) {
    return true; // 无魔术字的类型（txt/md/csv），信任
  }
  try {
    const buf = fs.readFileSync(filePath);
    const head = Array.from(buf.subarray(0, 8));
    return signatures.some(sig => sig.every((b, i) => head[i] === b));
  } catch {
    return false;
  }
}

function validateImageMagic(filePath: string, ext: string): boolean {
  const signatures = IMAGE_MAGIC[ext];
  if (!signatures) return false;

  // WebP 额外检查偏移 8-11 的 WEBP 标识
  if (ext === 'webp') {
    try {
      const buf = fs.readFileSync(filePath);
      const head = Array.from(buf.subarray(0, 12));
      const isRiff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
      const isWebp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
      return isRiff && isWebp;
    } catch { return false; }
  }

  try {
    const buf = fs.readFileSync(filePath);
    const head = Array.from(buf.subarray(0, Math.max(...signatures.map(s => s.length))));
    return signatures.some(sig => sig.every((b, i) => head[i] === b));
  } catch {
    return false;
  }
}

/**
 * POST /api/upload/image
 * 上传后生成清晰版 + 模糊版，创建 ImageReview 记录
 * 返回 { urls: [{ url, blurredUrl, reviewId }] }
 */
export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return error(res, '请选择图片文件');
    if (files.length > 9) return error(res, '单次最多上传9张图片');

    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) return error(res, `文件 ${file.originalname} 不是有效的图片格式`);
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return error(res, `不支持的图片格式: .${ext}`);

      // 魔术字节校验：防止将非图片文件改扩展名上传
      if (ext && !validateImageMagic(file.path, ext)) {
        try { fs.unlinkSync(file.path); } catch {}
        return error(res, `文件 ${file.originalname} 不是有效的图片（文件内容与扩展名不匹配）`);
      }
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const isBanner = req.body.context === 'banner';
        const url = isBanner ? await compressBannerImage(file.path) : await compressImage(file.path);
        const blurredUrl = await createBlurredImage(file.path);

        // 创建图片审核记录（admin 上传自动通过）
        const review = await prisma.imageReview.create({
          data: {
            url,
            blurredUrl,
            uploaderId: req.user!.userId,
            context: isBanner ? 'banner' : 'goods',
            status: req.user!.role === 'admin' ? 'approved' : 'pending',
          },
        });

        return { url, blurredUrl, reviewId: review.id };
      }),
    );

    return success(res, { urls: results }, '上传成功');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/upload/file
 * 通用文件上传（PDF/Word/ZIP 等文档），不经过图片压缩
 */
export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) return error(res, '请选择文件');

    // 魔术字校验：拒绝扩展名与实际内容不符的文件
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!validateMagicBytes(file.path, ext)) {
      fs.unlink(file.path, () => {}); // 删除可疑文件
      return error(res, '文件类型与扩展名不匹配，已被拒绝');
    }

    const normalized = file.path.replace(/\\/g, '/');
    const idx = normalized.indexOf('/uploads/');
    const url = idx >= 0 ? normalized.slice(idx) : `/uploads/documents/${file.filename}`;

    // 文件名安全处理：移除特殊字符，防止下载时乱码
    const safeName = file.originalname
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    return success(res, { url, originalName: safeName, size: file.size }, '上传成功');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/upload/avatar
 * 上传头像 — 压缩后直接更新用户 avatarUrl
 */
export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return error(res, '请选择图片文件');

    const file = files[0];
    if (!file.mimetype.startsWith('image/')) return error(res, '请上传图片文件');

    const url = await compressImage(file.path);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl: url },
    });

    return success(res, { url }, '头像上传成功');
  } catch (err) {
    next(err);
  }
}
