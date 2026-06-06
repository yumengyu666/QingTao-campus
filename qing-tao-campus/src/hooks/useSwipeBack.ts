import { useEffect, useRef } from 'react';

/**
 * 移动端左边缘滑动返回 Hook
 * 用法: useSwipeBack(() => navigate(-1))
 */
export function useSwipeBack(onSwipe: () => void, enabled = true) {
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX.current;
      const dy = endY - startY.current;

      // 左边缘出发 + 向右滑动 > 80px + 水平 > 垂直
      if (startX.current < 40 && dx > 80 && Math.abs(dx) > Math.abs(dy)) {
        onSwipe();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe, enabled]);
}
