"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadVoice = exports.uploadDocument = exports.upload = void 0;
exports.verifyImageMagic = verifyImageMagic;
exports.verifyDocumentMagic = verifyDocumentMagic;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
// ─── 魔术字节验证（防止 .exe 改名为 .pdf 绕过） ───
// 常见图片格式的魔术字节签名
const MAGIC_BYTES = {
    png: [[0x89, 0x50, 0x4E, 0x47]],
    jpg: [[0xFF, 0xD8, 0xFF]],
    jpeg: [[0xFF, 0xD8, 0xFF]],
    gif: [[0x47, 0x49, 0x46, 0x38]],
    webp: [[0x52, 0x49, 0x46, 0x46]],
    bmp: [[0x42, 0x4D]],
};
// 文档格式的魔术字节签名
const DOC_MAGIC_BYTES = {
    pdf: [[0x25, 0x50, 0x44, 0x46]],
    doc: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // OLE2 (doc/xls/ppt)
    docx: [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based (docx/xlsx/pptx)
    xls: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    xlsx: [[0x50, 0x4B, 0x03, 0x04]],
    ppt: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    pptx: [[0x50, 0x4B, 0x03, 0x04]],
    zip: [[0x50, 0x4B, 0x03, 0x04]],
    rar: [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00]], // RAR4/RAR5
    '7z': [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]],
};
/** 验证文件魔术字节是否匹配声称的扩展名 */
function verifyMagicBytes(filePath, ext, magicMap) {
    try {
        const fd = fs_1.default.openSync(filePath, 'r');
        const buf = Buffer.alloc(16);
        fs_1.default.readSync(fd, buf, 0, 16, 0);
        fs_1.default.closeSync(fd);
        const signatures = magicMap[ext];
        if (!signatures)
            return true; // 无签名表 → 放行（保守策略）
        return signatures.some(sig => {
            for (let i = 0; i < sig.length; i++) {
                if (buf[i] !== sig[i])
                    return false;
            }
            return true;
        });
    }
    catch {
        return false; // 读取失败 → 拒绝
    }
}
/** multer 完成后的魔术字节验证中间件（仅图片） */
function verifyImageMagic(req, res, next) {
    const files = req.files;
    if (!files || files.length === 0)
        return next();
    for (const file of files) {
        const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
        if (!verifyMagicBytes(file.path, ext, MAGIC_BYTES)) {
            // 删除伪造文件
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch { }
            return res.status(400).json({ code: 400, message: `文件 "${file.originalname}" 不是有效的图片文件`, data: null });
        }
    }
    next();
}
/** multer 完成后的魔术字节验证中间件（仅文档） */
function verifyDocumentMagic(req, res, next) {
    const file = req.file;
    if (!file)
        return next();
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    // txt/md/csv 无固定魔术字节，跳过验证
    if (['txt', 'md', 'csv'].includes(ext))
        return next();
    if (!verifyMagicBytes(file.path, ext, DOC_MAGIC_BYTES)) {
        try {
            fs_1.default.unlinkSync(file.path);
        }
        catch { }
        return res.status(400).json({ code: 400, message: `文件 "${file.originalname}" 不是有效的${ext.toUpperCase()}文件`, data: null });
    }
    next();
}
// 确保年月目录存在
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dir = path_1.default.resolve(env_1.env.UPLOAD_PATH, yearMonth);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, _file, cb) => {
        cb(null, `${(0, uuid_1.v4)()}.webp`);
    },
});
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp']);
const fileFilter = (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext && IMAGE_EXTS.has(ext) && IMAGE_MIMES.has(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('仅支持上传图片文件（PNG/JPG/GIF/WebP/BMP）'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.env.MAX_FILE_SIZE,
        files: env_1.env.MAX_FILES_PER_REQUEST,
    },
});
// ─── 通用文件上传（PDF/Word/ZIP 等文档） ───
const ALLOWED_FILE_EXTS = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'txt', 'md', 'csv',
];
function documentFilter(_req, file, cb) {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext && ALLOWED_FILE_EXTS.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error(`不支持的文件类型: .${ext}。支持的类型: ${ALLOWED_FILE_EXTS.join(', ')}`));
    }
}
const docStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dir = path_1.default.resolve(env_1.env.UPLOAD_PATH, 'documents', yearMonth);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
        cb(null, `${(0, uuid_1.v4)()}.${ext}`);
    },
});
exports.uploadDocument = (0, multer_1.default)({
    storage: docStorage,
    fileFilter: documentFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB for documents
        files: 1,
    },
});
// ─── 语音上传 (WebM/Opus) ───
function voiceFilter(_req, file, cb) {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext && (ext === 'webm' || ext === 'opus' || ext === 'wav' || ext === 'mp3' || ext === 'ogg' || ext === 'm4a')) {
        cb(null, true);
    }
    else {
        cb(new Error('语音仅支持 WebM/Opus/WAV/MP3/OGG/M4A 格式'));
    }
}
const voiceStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dir = path_1.default.resolve(env_1.env.UPLOAD_PATH, 'voice', yearMonth);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() || 'webm';
        cb(null, `${(0, uuid_1.v4)()}.${ext}`);
    },
});
exports.uploadVoice = (0, multer_1.default)({
    storage: voiceStorage,
    fileFilter: voiceFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for voice
        files: 1,
    },
});
//# sourceMappingURL=upload.js.map