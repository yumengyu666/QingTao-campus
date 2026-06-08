import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { env } from '../config/env';

// ─── 魔术字节验证（防止 .exe 改名为 .pdf 绕过） ───

// 常见图片格式的魔术字节签名
const MAGIC_BYTES: Record<string, number[][]> = {
  png:  [[0x89, 0x50, 0x4E, 0x47]],
  jpg:  [[0xFF, 0xD8, 0xFF]],
  jpeg: [[0xFF, 0xD8, 0xFF]],
  gif:  [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  bmp:  [[0x42, 0x4D]],
};

// 文档格式的魔术字节签名
const DOC_MAGIC_BYTES: Record<string, number[][]> = {
  pdf:  [[0x25, 0x50, 0x44, 0x46]],
  doc:  [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // OLE2 (doc/xls/ppt)
  docx: [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based (docx/xlsx/pptx)
  xls:  [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  xlsx: [[0x50, 0x4B, 0x03, 0x04]],
  ppt:  [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  pptx: [[0x50, 0x4B, 0x03, 0x04]],
  zip:  [[0x50, 0x4B, 0x03, 0x04]],
  rar:  [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00]], // RAR4/RAR5
  '7z': [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]],
};

/** 验证文件魔术字节是否匹配声称的扩展名 */
function verifyMagicBytes(filePath: string, ext: string, magicMap: Record<string, number[][]>): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);

    const signatures = magicMap[ext];
    if (!signatures) return true; // 无签名表 → 放行（保守策略）

    return signatures.some(sig => {
      for (let i = 0; i < sig.length; i++) {
        if (buf[i] !== sig[i]) return false;
      }
      return true;
    });
  } catch {
    return false; // 读取失败 → 拒绝
  }
}

/** multer 完成后的魔术字节验证中间件（仅图片） */
export function verifyImageMagic(req: Express.Request, res: any, next: any) {
  const files = (req as any).files as Express.Multer.File[];
  if (!files || files.length === 0) return next();

  for (const file of files) {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!verifyMagicBytes(file.path, ext, MAGIC_BYTES)) {
      // 删除伪造文件
      try { fs.unlinkSync(file.path); } catch {}
      return res.status(400).json({ code: 400, message: `文件 "${file.originalname}" 不是有效的图片文件`, data: null });
    }
  }
  next();
}

/** multer 完成后的魔术字节验证中间件（仅文档） */
export function verifyDocumentMagic(req: Express.Request, res: any, next: any) {
  const file = (req as any).file as Express.Multer.File;
  if (!file) return next();

  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
  // txt/md/csv 无固定魔术字节，跳过验证
  if (['txt', 'md', 'csv'].includes(ext)) return next();

  if (!verifyMagicBytes(file.path, ext, DOC_MAGIC_BYTES)) {
    try { fs.unlinkSync(file.path); } catch {}
    return res.status(400).json({ code: 400, message: `文件 "${file.originalname}" 不是有效的${ext.toUpperCase()}文件`, data: null });
  }
  next();
}

// 确保年月目录存在
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dir = path.resolve(env.UPLOAD_PATH, yearMonth);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${uuidv4()}.webp`);
  },
});

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp']);

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (ext && IMAGE_EXTS.has(ext) && IMAGE_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持上传图片文件（PNG/JPG/GIF/WebP/BMP）'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: env.MAX_FILES_PER_REQUEST,
  },
});

// ─── 通用文件上传（PDF/Word/ZIP 等文档） ───

const ALLOWED_FILE_EXTS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'rar', '7z', 'txt', 'md', 'csv',
];

function documentFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (ext && ALLOWED_FILE_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: .${ext}。支持的类型: ${ALLOWED_FILE_EXTS.join(', ')}`));
  }
}

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dir = path.resolve(env.UPLOAD_PATH, 'documents', yearMonth);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    cb(null, `${uuidv4()}.${ext}`);
  },
});

export const uploadDocument = multer({
  storage: docStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB for documents
    files: 1,
  },
});
