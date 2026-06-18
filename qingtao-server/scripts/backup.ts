/**
 * 数据库备份脚本
 * 用法: tsx scripts/backup.ts
 * 可通过 cron 定时调用: 0 */6 * * * cd /path/to/server && tsx scripts/backup.ts
 */
import * as path from 'path';
import * as fs from 'fs';

const DB_SOURCE = path.resolve(__dirname, '..', 'prisma', 'dev.db');
const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

async function backup() {
  if (!fs.existsSync(DB_SOURCE)) {
    console.error(`[Backup] Database file not found: ${DB_SOURCE}`);
    process.exit(1);
  }

  // 创建备份目录
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    fs.copyFileSync(DB_SOURCE, backupPath);
    console.log(`[Backup] ✅ Created: ${backupName}`);
  } catch (err: any) {
    console.error(`[Backup] ❌ Failed: ${err.message}`);
    process.exit(1);
  }

  // 清理超过 7 天的旧备份
  const now = Date.now();
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-') && f.endsWith('.db'));
  let cleaned = 0;
  for (const f of files) {
    const stat = fs.statSync(path.join(BACKUP_DIR, f));
    if (now - stat.mtimeMs > MAX_AGE) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`[Backup] 🧹 Cleaned ${cleaned} old backups`);

  console.log(`[Backup] 📦 Total backups: ${files.length - cleaned + 1}`);
}

backup();
