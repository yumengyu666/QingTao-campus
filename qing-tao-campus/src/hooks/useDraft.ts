import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 表单草稿自动保存 hook
 * 使用 localStorage 持久化，意外关闭页面后可恢复
 */
export function useDraft<T extends Record<string, any>>(
  key: string,
  initialValue: T,
) {
  const [data, setData] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`draft_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialValue, ...parsed };
      }
    } catch {}
    return initialValue;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keyRef = useRef(key);
  keyRef.current = key;

  const save = useCallback((value: T) => {
    setData(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        // 过滤掉空值和函数
        const toSave: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          if (v === '' || v === null || v === undefined || v === false) continue;
          if (Array.isArray(v) && v.length === 0) continue;
          if (typeof v === 'function') continue;
          toSave[k] = v;
        }
        if (Object.keys(toSave).length > 0) {
          localStorage.setItem(`draft_${keyRef.current}`, JSON.stringify(toSave));
        }
      } catch {}
    }, 800);
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(`draft_${keyRef.current}`);
    } catch {}
    setData(initialValue);
  }, [initialValue]);

  return { data, setData: save, clear };
}
