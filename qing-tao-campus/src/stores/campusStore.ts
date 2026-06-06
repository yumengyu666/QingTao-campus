import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Campus = '' | 'kexue' | 'dongfeng';

interface CampusStore {
  campus: Campus;
  setCampus: (c: Campus) => void;
  toggle: () => void;
}

export const useCampusStore = create<CampusStore>()(
  persist(
    (set, get) => ({
      campus: '',
      setCampus: (c) => set({ campus: c }),
      toggle: () => set(s => ({
        campus: s.campus === 'kexue' ? 'dongfeng' : s.campus === 'dongfeng' ? '' : 'kexue',
      })),
    }),
    { name: 'qingtao-campus-pref' },
  ),
);
