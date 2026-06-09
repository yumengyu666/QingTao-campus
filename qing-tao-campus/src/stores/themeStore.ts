import { create } from 'zustand';

export type ThemeName = 'emerald' | 'ocean' | 'warm' | 'sakura' | 'minimal' | 'midnight';

interface ThemeConfig {
  name: ThemeName;
  label: string;
  primary: string;
  primaryLight: string;
  accent: string;
  gradient: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  emerald:  { name: 'emerald',  label: '清新绿',  primary: '#10b981', primaryLight: '#d1fae5', accent: '#059669', gradient: 'from-emerald-400 to-teal-400' },
  ocean:    { name: 'ocean',    label: '海洋蓝',  primary: '#3b82f6', primaryLight: '#dbeafe', accent: '#2563eb', gradient: 'from-blue-400 to-cyan-400' },
  warm:     { name: 'warm',     label: '暖橙',   primary: '#f59e0b', primaryLight: '#fef3c7', accent: '#d97706', gradient: 'from-amber-400 to-orange-400' },
  sakura:   { name: 'sakura',   label: '樱花粉',  primary: '#ec4899', primaryLight: '#fce7f3', accent: '#db2777', gradient: 'from-pink-400 to-rose-400' },
  minimal:  { name: 'minimal',  label: '极简白',  primary: '#6b7280', primaryLight: '#f3f4f6', accent: '#4b5563', gradient: 'from-gray-400 to-slate-400' },
  midnight: { name: 'midnight', label: '暗夜黑',  primary: '#8b5cf6', primaryLight: '#ede9fe', accent: '#7c3aed', gradient: 'from-violet-400 to-purple-400' },
};

interface ThemeState {
  theme: ThemeConfig;
  setTheme: (name: ThemeName) => void;
}

function getInitialTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem('qingtao-theme');
    if (saved && THEMES[saved as ThemeName]) return THEMES[saved as ThemeName];
  } catch {}
  return THEMES.emerald;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (name) => {
    localStorage.setItem('qingtao-theme', name);
    const cfg = THEMES[name];
    document.documentElement.style.setProperty('--color-primary', cfg.primary);
    document.documentElement.style.setProperty('--color-primary-light', cfg.primaryLight);
    document.documentElement.style.setProperty('--color-accent', cfg.accent);
    set({ theme: cfg });
  },
}));

// Init on load
const init = getInitialTheme();
document.documentElement.style.setProperty('--color-primary', init.primary);
document.documentElement.style.setProperty('--color-primary-light', init.primaryLight);
document.documentElement.style.setProperty('--color-accent', init.accent);
