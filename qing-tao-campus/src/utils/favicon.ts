let unreadCount = 0;

export function setFaviconUnread(count: number) {
  unreadCount = count;
  updateFavicon();
}

function updateFavicon() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw circle background
  const centerX = 16;
  const centerY = 16;
  const radius = 14;

  // Green gradient background
  const grad = ctx.createLinearGradient(0, 0, 32, 32);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#8b5cf6');
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  if (unreadCount > 0) {
    // Red dot indicator
    const dotX = 26;
    const dotY = 6;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Count text
    if (unreadCount > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = unreadCount > 99 ? '99+' : String(unreadCount);
      ctx.fillText(text, dotX, dotY + 0.5);
    }
  }

  // "轻" character
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('轻', centerX, centerY + 1);

  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) {
    link.href = canvas.toDataURL();
  }
}

/** Update document.title with unread count */
export function setTitleUnread(count: number) {
  if (count > 0) {
    document.title = `(${count}) 轻淘 - 郑轻校园`;
  } else {
    document.title = '轻淘 - 郑轻校园';
  }
  setFaviconUnread(count);
}
