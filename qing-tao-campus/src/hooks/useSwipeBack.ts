import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 移动端左边缘滑动返回 Hook
 * 用法: const { swipeProgress } = useSwipeBack(() => navigate(-1), isSubPage)
 *
 * @returns swipeProgress — 0-1 滑动进度，用于渲染视觉指示器
 */
export function useSwipeBack(onSwipe: () => void, enabled = true) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const [progress, setProgress] = useState(0);

  const resetProgress = useCallback(() => {
    tracking.current = false;
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetProgress();
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      // Only track touches that start near the left edge
      tracking.current = startX.current < 40;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Only continue tracking rightward swipes where horizontal > vertical
      if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
        setProgress(Math.min(dx / 120, 1));
      } else if (dx <= 0) {
        // User moved back left — stop tracking
        tracking.current = false;
        setProgress(0);
      }
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

      resetProgress();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      resetProgress();
    };
  }, [onSwipe, enabled, resetProgress]);

  return { swipeProgress: progress };
}
