import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompareItem {
  id: number;
  title: string;
  price: number;
  images: string[];
  condition: string;
  campus: string;
  categoryName?: string;
}

interface CompareStore {
  items: CompareItem[];
  addItem: (item: CompareItem) => { ok: boolean; message: string };
  removeItem: (id: number) => void;
  clearAll: () => void;
  hasItem: (id: number) => boolean;
}

const MAX_COMPARE = 4;

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const { items } = get();
        if (items.length >= MAX_COMPARE) {
          return { ok: false, message: `最多对比${MAX_COMPARE}个商品` };
        }
        if (items.some(i => i.id === item.id)) {
          return { ok: false, message: '该商品已在对比列表中' };
        }
        set({ items: [...items, item] });
        return { ok: true, message: '已加入对比' };
      },
      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      clearAll: () => set({ items: [] }),
      hasItem: (id) => get().items.some(i => i.id === id),
    }),
    { name: 'qingtao-compare' },
  ),
);
