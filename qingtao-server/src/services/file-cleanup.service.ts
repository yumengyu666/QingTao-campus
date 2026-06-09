import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_AGE_DAYS = 7;

/**
 * 定时清理7天前的未引用上传文件
 * 对应任务 #65311c1 [后端R7]
 */
export async function cleanupOrphanFiles(): Promise<number> {
  if (!fs.existsSync(UPLOAD_DIR)) return 0;

  let deleted = 0;
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { scan(fullPath); continue; }
      try {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
          deleted++;
        }
      } catch {}
    }
  }

  try { scan(UPLOAD_DIR); } catch (e: any) { logger.error(`File cleanup error: ${e.message}`); }

  if (deleted > 0) logger.info(`🧹 Cleaned ${deleted} orphan files`);
  return deleted;
}
