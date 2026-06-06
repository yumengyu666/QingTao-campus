/**
 * 相对时间格式化 — 将 ISO 时间戳转为人类可读格式
 * 例：3分钟前、1小时前、昨天 14:30、6月1日、2025年6月1日
 */
export function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const thisYear = now.getFullYear() === date.getFullYear();
  if (diffDay < 365 && thisYear) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
