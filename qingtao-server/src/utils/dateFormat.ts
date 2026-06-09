/**
 * 日期格式化工具 — 东八区 (Asia/Shanghai)
 */

const TZ_OFFSET = 8 * 60 * 60 * 1000; // +0800

/** UTC → 东八区 Date 对象 */
function toBeijing(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getTime() + TZ_OFFSET);
}

/** UTC → 东八区 ISO 字符串 */
export function toBeijingISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const beijing = new Date(d.getTime() + TZ_OFFSET);
  return beijing.toISOString().replace('Z', '+08:00');
}

/** 获取东八区当天 0 点的时间戳 */
function startOfTodayBeijing(): number {
  const nowBeijing = toBeijing(new Date());
  return Date.UTC(
    nowBeijing.getUTCFullYear(),
    nowBeijing.getUTCMonth(),
    nowBeijing.getUTCDate(),
    0, 0, 0, 0,
  );
}

/** 相对时间描述（增强版：支持今天/昨天/前天 + 时间） */
export function relativeTime(date: Date | string): string {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const now = Date.now();
  const diff = now - timestamp;

  const sec = Math.floor(diff / 1000);
  if (sec < 0) return '刚刚';
  if (sec < 60) return '刚刚';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;

  const hour = Math.floor(min / 60);

  // 计算日期差异（基于东八区当天 0 点）
  const todayStart = startOfTodayBeijing();
  const targetStart = (() => {
    const d = toBeijing(date);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
  })();

  const dayDiff = Math.floor((todayStart - targetStart) / 86400000);
  const hm = formatTime(date);

  if (dayDiff === 0) {
    // 今天
    return `今天 ${hm}`;
  }
  if (dayDiff === 1) {
    // 昨天
    return `昨天 ${hm}`;
  }
  if (dayDiff === 2) {
    // 前天
    return `前天 ${hm}`;
  }

  if (hour < 24 * 7) {
    return `${Math.floor(hour / 24)}天前`;
  }

  if (hour < 24 * 30) {
    return `${Math.floor(hour / 24 / 7)}周前`;
  }

  // 超过 30 天：同年显示 MM-DD，跨年显示完整日期
  const nowBJ = toBeijing(new Date());
  const dateBJ = toBeijing(new Date(timestamp));
  if (nowBJ.getUTCFullYear() === dateBJ.getUTCFullYear()) {
    const m = String(dateBJ.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateBJ.getUTCDate()).padStart(2, '0');
    return `${m}-${d} ${hm}`;
  }
  return toBeijingISO(date).slice(0, 10);
}

/** 格式化日期 YYYY-MM-DD */
export function formatDate(date: Date | string): string {
  return toBeijingISO(date).slice(0, 10);
}

/** 格式化时间 HH:mm */
export function formatTime(date: Date | string): string {
  return toBeijingISO(date).slice(11, 16);
}
