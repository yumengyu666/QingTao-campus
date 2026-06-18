import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Keyboard navigation shortcuts for power users.
 *
 * Shortcuts:
 * - Ctrl+K / Cmd+K → Search page
 * - Ctrl+H / Cmd+H → Home
 * - Ctrl+G / Cmd+G → Goods list
 * - Ctrl+M / Cmd+M → Messages
 * - Ctrl+P / Cmd+P → Profile
 * - Ctrl+N / Cmd+N → Publish (handled by PublishModal)
 * - Esc → Close modals / go back
 * - / → Focus search input
 */
export function useKeyboardNav() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // / to focus search (only when not in input)
      if (e.key === '/' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], [data-search-input]');
        searchInput?.focus();
        return;
      }

      // Requires Ctrl/Cmd
      if (!e.ctrlKey && !e.metaKey) return;
      if (isInput) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case 'k':
          e.preventDefault();
          navigate('/search');
          break;
        case 'h':
          e.preventDefault();
          navigate('/');
          break;
        case 'g':
          e.preventDefault();
          navigate('/goods');
          break;
        case 'm':
          e.preventDefault();
          navigate('/messages');
          break;
        case 'p':
          e.preventDefault();
          navigate('/profile');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
