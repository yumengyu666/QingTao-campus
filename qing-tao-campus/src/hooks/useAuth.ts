import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

export function useInit() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
}
