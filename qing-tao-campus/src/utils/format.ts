export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

/** 相对时间 — 用于会话列表、帖子列表等预览场景 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMs < 0) return '刚刚';
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  if (diffDay < 365) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** 聊天时间 — 微信风格，用于聊天界面的中央时间戳 */
export function formatChatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisYear = new Date(now.getFullYear(), 0, 1);

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const MM = date.getMonth() + 1;
  const DD = date.getDate();

  if (date >= today) {
    return `${hh}:${mm}`;
  }
  if (date >= yesterday) {
    return `昨天 ${hh}:${mm}`;
  }
  if (date >= thisYear) {
    return `${MM}月${DD}日 ${hh}:${mm}`;
  }
  return `${date.getFullYear()}年${MM}月${DD}日 ${hh}:${mm}`;
}

/** 相对时间 — 1分钟内"刚刚"，1时内"X分钟前"，24时内"X小时前"，7天内"X天前"，否则用 formatDate */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMs < 0) return '刚刚';
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return formatDate(dateStr);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function formatCount(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}
