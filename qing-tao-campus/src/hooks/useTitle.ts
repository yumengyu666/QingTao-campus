import { useEffect } from 'react';

export function useTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · 轻淘` : '轻淘 - 郑州轻工业大学校园二手交易平台';
    return () => { document.title = prev; };
  }, [title]);
}
