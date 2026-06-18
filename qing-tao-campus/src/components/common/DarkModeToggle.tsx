/**
 * DarkModeToggle — 三态主题切换（亮色/暗色/跟随系统）
 *
 * Features:
 * - 支持 light | dark | system 三种模式
 * - localStorage 持久化
 * - 系统偏好自动检测（prefers-color-scheme）
 * - 平滑过渡动画
 * - ARIA 标签完善
 */
import { useState, useEffect, useCallback } from 'react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';
const CYCLE_ORDER: Theme[] = ['light', 'dark', 'system'];

const iconMap: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: FiSun,
  dark: FiMoon,
  system: FiMonitor,
};

const titleMap: Record<Theme, string> = {
  light: '当前：亮色模式 — 点击切换暗色',
  dark: '当前：暗色模式 — 点击跟随系统',
  system: '当前：跟随系统 — 点击切换亮色',
};

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {}
  return 'system';
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

export function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const idx = CYCLE_ORDER.indexOf(prev);
      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    });
  }, []);

  const Icon = iconMap[theme];

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      title={titleMap[theme]}
      aria-label={titleMap[theme]}
    >
      <Icon className="text-lg" />
    </button>
  );
}
