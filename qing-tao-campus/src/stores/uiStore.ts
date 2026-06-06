import { create } from 'zustand';
import { storage } from '@/utils/storage';

interface UIState {
  theme: 'light' | 'dark';
  activeTab: number;
  toggleTheme: () => void;
  setActiveTab: (tab: number) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: storage.getTheme(),
  activeTab: 0,
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    storage.setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: newTheme });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
