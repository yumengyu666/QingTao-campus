import { create } from 'zustand';

export type ThemeName = 'indigo' | 'ocean' | 'emerald' | 'amber' | 'rose' | 'purple' | 'midnight';

interface ThemeConfig {
  name: ThemeName;
  label: string;
  description: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBg: string;
  accent: string;
  accentBg: string;
  gradient: string;
  icon: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  indigo: {
    name: 'indigo',
    label: '靛蓝',
    description: '品牌默认色，智慧沉稳',
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4338ca',
    primaryBg: '#eef2ff',
    accent: '#f59e0b',
    accentBg: '#fffbeb',
    gradient: 'from-indigo-500 to-purple-500',
    icon: '💎',
  },
  ocean: {
    name: 'ocean',
    label: '海洋蓝',
    description: '清新冷静，适合学习',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',
    primaryBg: '#eff6ff',
    accent: '#06b6d4',
    accentBg: '#ecfeff',
    gradient: 'from-blue-400 to-cyan-400',
    icon: '🌊',
  },
  emerald: {
    name: 'emerald',
    label: '翡翠绿',
    description: '自然舒适，护眼柔和',
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    primaryBg: '#ecfdf5',
    accent: '#14b8a6',
    accentBg: '#f0fdfa',
    gradient: 'from-emerald-400 to-teal-400',
    icon: '🍃',
  },
  amber: {
    name: 'amber',
    label: '暖橙',
    description: '温暖活力，醒目提示',
    primary: '#f59e0b',
    primaryLight: '#fbbf24',
    primaryDark: '#d97706',
    primaryBg: '#fffbeb',
    accent: '#f97316',
    accentBg: '#fff7ed',
    gradient: 'from-amber-400 to-orange-400',
    icon: '🔥',
  },
  rose: {
    name: 'rose',
    label: '玫红',
    description: '温柔浪漫，恋爱专属',
    primary: '#f43f5e',
    primaryLight: '#fb7185',
    primaryDark: '#e11d48',
    primaryBg: '#fff1f2',
    accent: '#ec4899',
    accentBg: '#fdf2f8',
    gradient: 'from-pink-400 to-rose-400',
    icon: '🌸',
  },
  purple: {
    name: 'purple',
    label: '紫罗兰',
    description: '神秘高雅，创意灵感',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    primaryDark: '#6d28d9',
    primaryBg: '#f5f3ff',
    accent: '#c084fc',
    accentBg: '#faf5ff',
    gradient: 'from-violet-400 to-purple-400',
    icon: '🔮',
  },
  midnight: {
    name: 'midnight',
    label: '暗夜紫',
    description: '深邃暗色，夜间护眼',
    primary: '#a78bfa',
    primaryLight: '#c4b5fd',
    primaryDark: '#7c3aed',
    primaryBg: '#2e10651a',
    accent: '#818cf8',
    accentBg: '#312e811a',
    gradient: 'from-violet-400 to-indigo-400',
    icon: '🌙',
  },
};

interface ThemeState {
  theme: ThemeConfig;
  setTheme: (name: ThemeName) => void;
  applyThemeTokens: (cfg: ThemeConfig) => void;
}

/**
 * Apply theme tokens to CSS custom properties on :root.
 * Updates the entire brand color cascade.
 */
function applyThemeTokens(cfg: ThemeConfig): void {
  const root = document.documentElement;

  // Brand primary tokens
  root.style.setProperty('--color-brand-primary', cfg.primary);
  root.style.setProperty('--color-brand-primary-light', cfg.primaryLight);
  root.style.setProperty('--color-brand-primary-dark', cfg.primaryDark);
  root.style.setProperty('--color-brand-primary-bg', cfg.primaryBg);
  root.style.setProperty('--color-brand-primary-text', cfg.primaryDark);

  // Brand accent tokens
  root.style.setProperty('--color-brand-accent', cfg.accent);
  root.style.setProperty('--color-brand-accent-light', cfg.accent);
  root.style.setProperty('--color-brand-accent-bg', cfg.accentBg);

  // Legacy compatibility
  root.style.setProperty('--color-primary', cfg.primary);
  root.style.setProperty('--color-primary-light', cfg.primaryLight);
  root.style.setProperty('--color-primary-dark', cfg.primaryDark);
  root.style.setProperty('--color-accent', cfg.accent);

  // Component token overrides
  root.style.setProperty('--btn-primary-bg', cfg.primary);
  root.style.setProperty('--btn-primary-bg-hover', cfg.primaryDark);
  root.style.setProperty('--btn-primary-bg-active', cfg.primaryDark);
  root.style.setProperty('--btn-primary-shadow', `0 1px 2px ${cfg.primary}33`);
  root.style.setProperty('--btn-primary-shadow-hover', `0 4px 12px ${cfg.primary}59`);

  root.style.setProperty('--color-border-focus', cfg.primaryLight);
  root.style.setProperty('--color-text-link', cfg.primaryDark);
  root.style.setProperty('--color-text-link-hover', cfg.primaryDark);
  root.style.setProperty('--color-text-brand', cfg.primaryDark);

  // Navigation
  root.style.setProperty('--nav-item-bg-active', cfg.primaryBg);
  root.style.setProperty('--nav-item-text-active', cfg.primaryDark);

  // Selected state
  root.style.setProperty('--color-bg-selected', cfg.primaryBg);

  // Focus ring
  root.style.setProperty('--input-shadow-focus', `0 0 0 3px ${cfg.primary}1a`);

  // Glow shadow
  root.style.setProperty('--shadow-glow', `0 0 20px ${cfg.primary}26, 0 0 40px ${cfg.primary}0f`);
}

function getInitialTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem('qingtao-theme');
    if (saved && THEMES[saved as ThemeName]) return THEMES[saved as ThemeName];
  } catch {}
  return THEMES.indigo;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  applyThemeTokens,
  setTheme: (name) => {
    localStorage.setItem('qingtao-theme', name);
    const cfg = THEMES[name];
    applyThemeTokens(cfg);
    set({ theme: cfg });
  },
}));

// Init on load
const init = getInitialTheme();
applyThemeTokens(init);
