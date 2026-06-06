/**
 * 日期格式化工具 — 东八区 (Asia/Shanghai)
 */

const TZ_OFFSET = 8 * 60 * 60 * 1000; // +0800

/** UTC → 东八区 ISO 字符串 */
export function toBeijingISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const beijing = new Date(d.getTime() + TZ_OFFSET);
  return beijing.toISOString().replace('Z', '+08:00');
}

/** 相对时间描述 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}天前`;
  if (day < 30) return `${Math.floor(day / 7)}周前`;
  return toBeijingISO(d).slice(0, 10); // 显示日期
}

/** 格式化日期 YYYY-MM-DD */
export function formatDate(date: Date | string): string {
  return toBeijingISO(date).slice(0, 10);
}

/** 格式化时间 HH:mm */
export function formatTime(date: Date | string): string {
  return toBeijingISO(date).slice(11, 16);
}
