import { useEffect, useRef, useCallback } from 'react';

/**
 * 无限滚动 Hook
 * 用法: useInfiniteScroll({ onLoadMore, hasMore, loading })
 */
interface InfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
}

export function useInfiniteScroll({ onLoadMore, hasMore, loading, threshold = 200 }: InfiniteScrollOptions) {
  const observer = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      if (!node || !hasMore) return;

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMore();
          }
        },
        { rootMargin: `0px 0px ${threshold}px 0px` }
      );
      observer.current.observe(node);
    },
    [loading, hasMore, onLoadMore, threshold]
  );

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  return { sentinelRef };
}
