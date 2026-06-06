import { create } from 'zustand';
import { storage } from '@/utils/storage';

interface SearchState {
  history: string[];
  addHistory: (keyword: string) => void;
  removeHistory: (keyword: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  history: storage.getSearchHistory(),
  addHistory: (keyword) => {
    const filtered = get().history.filter((h) => h !== keyword);
    const updated = [keyword, ...filtered].slice(0, 20);
    storage.setSearchHistory(updated);
    set({ history: updated });
  },
  removeHistory: (keyword) => {
    const updated = get().history.filter((h) => h !== keyword);
    storage.setSearchHistory(updated);
    set({ history: updated });
  },
  clearHistory: () => {
    storage.clearSearchHistory();
    set({ history: [] });
  },
}));
