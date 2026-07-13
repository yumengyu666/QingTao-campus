import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '@/utils/storage';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  describe('token', () => {
    it('returns null when no token stored', () => {
      expect(storage.getToken()).toBeNull();
    });

    it('stores and retrieves token', () => {
      storage.setToken('test-token-abc');
      expect(storage.getToken()).toBe('test-token-abc');
    });

    it('removes token', () => {
      storage.setToken('test-token');
      storage.removeToken();
      expect(storage.getToken()).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('returns null when no refresh token stored', () => {
      expect(storage.getRefreshToken()).toBeNull();
    });

    it('stores and retrieves refresh token', () => {
      storage.setRefreshToken('refresh-xyz');
      expect(storage.getRefreshToken()).toBe('refresh-xyz');
    });

    it('removes refresh token', () => {
      storage.setRefreshToken('refresh-xyz');
      storage.removeRefreshToken();
      expect(storage.getRefreshToken()).toBeNull();
    });
  });

  describe('user', () => {
    it('returns null when no user stored', () => {
      expect(storage.getUser()).toBeNull();
    });

    it('stores and retrieves user object (safe fields only)', () => {
      const user = { id: 1, username: 'test', nickname: 'Test', role: 'user' };
      storage.setUser(user);
      // setUser strips sensitive fields like username for security
      expect(storage.getUser()).toEqual({ id: 1, nickname: 'Test', role: 'user' });
    });

    it('removes user', () => {
      storage.setUser({ id: 1 });
      storage.removeUser();
      expect(storage.getUser()).toBeNull();
    });

    it('returns null for corrupted user data', () => {
      localStorage.setItem('qingtao_user', 'not-json');
      expect(storage.getUser()).toBeNull();
    });
  });

  describe('theme', () => {
    it('defaults to light', () => {
      expect(storage.getTheme()).toBe('light');
    });

    it('stores and retrieves dark theme', () => {
      storage.setTheme('dark');
      expect(storage.getTheme()).toBe('dark');
    });
  });

  describe('search history', () => {
    it('returns empty array by default', () => {
      expect(storage.getSearchHistory()).toEqual([]);
    });

    it('stores and retrieves search history', () => {
      storage.setSearchHistory(['item1', 'item2']);
      expect(storage.getSearchHistory()).toEqual(['item1', 'item2']);
    });

    it('caps history at 20 items', () => {
      const items = Array.from({ length: 25 }, (_, i) => `item${i}`);
      storage.setSearchHistory(items);
      expect(storage.getSearchHistory()).toHaveLength(20);
    });

    it('clears search history', () => {
      storage.setSearchHistory(['a', 'b']);
      storage.clearSearchHistory();
      expect(storage.getSearchHistory()).toEqual([]);
    });
  });
});
