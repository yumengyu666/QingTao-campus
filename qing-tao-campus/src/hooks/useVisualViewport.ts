import { useState, useEffect, useCallback } from 'react';

/**
 * 移动端键盘适配 Hook
 * 返回 bottomOffset：输入框需要向上偏移的距离
 * 解决 iOS Safari 键盘遮挡底部输入框的问题
 */
export function useVisualViewport(): { bottomOffset: number; isKeyboardOpen: boolean } {
  const [bottomOffset, setBottomOffset] = useState(0);
  const [isKeyboardOpen, setKeyboardOpen] = useState(false);

  const handleResize = useCallback(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const keyboardHeight = window.innerHeight - viewport.height;
    if (keyboardHeight > 150) {
      setBottomOffset(keyboardHeight);
      setKeyboardOpen(true);
    } else {
      setBottomOffset(0);
      setKeyboardOpen(false);
    }
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, [handleResize]);

  return { bottomOffset, isKeyboardOpen };
}
