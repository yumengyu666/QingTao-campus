/**
 * useAsyncData — 统一异步数据获取 Hook
 *
 * 消除项目中的 catch(() => {}) 静默吞错反模式。
 * 每次调用提供 { data, loading, error, retry } 四元组。
 *
 * 使用示例:
 *   const { data, loading, error, retry } = useAsyncData(
 *     () => apiFetch('/api/notes'),
 *     [page]
 *   );
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    attemptRef.current += 1;

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err instanceof Error ? err.message : '加载失败，请稍后重试';
        setError(message);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { data, loading, error, retry: load };
}
