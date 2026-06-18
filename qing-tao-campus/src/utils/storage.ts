export const TOKEN_KEY = 'qingtao_token';
const REFRESH_KEY = 'qingtao_refresh';
export const USER_KEY = 'qingtao_user';
const THEME_KEY = 'qingtao_theme';
const SEARCH_HISTORY_KEY = 'qingtao_search_history';

export const storage = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),

  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  removeRefreshToken: () => localStorage.removeItem(REFRESH_KEY),

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: any) => {
    // Only persist non-sensitive fields to localStorage
    const safe = user ? {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      campusArea: user.campusArea,
    } : null;
    localStorage.setItem(USER_KEY, JSON.stringify(safe));
  },
  removeUser: () => localStorage.removeItem(USER_KEY),

  getTheme: (): 'light' | 'dark' => {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  },
  setTheme: (theme: 'light' | 'dark') => localStorage.setItem(THEME_KEY, theme),

  getSearchHistory: (): string[] => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  setSearchHistory: (history: string[]) => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  },
  clearSearchHistory: () => localStorage.removeItem(SEARCH_HISTORY_KEY),
};
