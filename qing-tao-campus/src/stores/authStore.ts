import { create } from 'zustand';
import { storage } from '@/utils/storage';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
}

// 初始化时立即从 localStorage 读取，确保刷新后首次渲染就有值
const initialToken = storage.getToken();
const initialUser = storage.getUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!(initialToken && initialUser),

  setAuth: (token: string, user: User, refreshToken?: string) => {
    storage.setToken(token);
    storage.setUser(user);
    if (refreshToken) storage.setRefreshToken(refreshToken);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    storage.removeToken();
    storage.removeUser();
    storage.removeRefreshToken();
    // 清除缓存数据（树洞点赞、搜索历史、草稿等）
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('draft_') || key.startsWith('treehole_') || key.startsWith('search_') || key.startsWith('browse_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    set({ token: null, user: null, isAuthenticated: false });
    // 强制刷新清除所有内存中的缓存数据
    window.location.href = '/login';
  },
}));
