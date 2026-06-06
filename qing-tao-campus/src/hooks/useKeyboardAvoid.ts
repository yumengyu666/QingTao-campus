import { useState, useEffect } from 'react';

/**
 * Mobile keyboard avoidance hook
 * Tracks visualViewport changes and returns the keyboard offset.
 * Apply as paddingBottom of the fixed bottom input area.
 */
export function useKeyboardAvoid() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handler = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardHeight(offset > 50 ? offset : 0);
    };

    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);

    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  return keyboardHeight;
}
