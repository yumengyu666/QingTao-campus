import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { env } from '../config/env';

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
