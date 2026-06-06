import { create } from 'zustand';

interface UnreadState {
  count: number;
  msgCount: number;
  setCount: (count: number | ((prev: number) => number)) => void;
  setMsgCount: (count: number | ((prev: number) => number)) => void;
  decrement: () => void;
  reset: () => void;
}

export const useUnreadStore = create<UnreadState>((set) => ({
  count: 0,
  msgCount: 0,
  setCount: (count) => set((s) => ({ count: typeof count === 'function' ? count(s.count) : count })),
  setMsgCount: (msgCount) => set((s) => ({ msgCount: typeof msgCount === 'function' ? msgCount(s.msgCount) : msgCount })),
  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
  reset: () => set({ count: 0, msgCount: 0 }),
}));
