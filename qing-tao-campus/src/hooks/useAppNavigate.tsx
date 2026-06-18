import { createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';

// ============================================================
// NavigationContext — 为液态玻璃版本提供 /lg 基础路径
// 所有页面内的 navigate 调用都会自动追加 basePath
// ============================================================

type NavTo = Parameters<NavigateFunction>[0];
type NavOptions = Parameters<NavigateFunction>[1];

interface NavContextValue {
  /** 当前基础路径，如 '/lg' 或 '' */
  basePath: string;
  /** 带 basePath 的导航 */
  nav: (to: NavTo, options?: NavOptions) => void;
}

export const NavigationContext = createContext<NavContextValue>({
  basePath: '',
  nav: () => {},
});

/** 获取当前导航上下文（basePath + nav） */
export function useNavContext() {
  return useContext(NavigationContext);
}

/**
 * 智能导航 hook — 替代 useNavigate
 * 在液态玻璃版本中，`nav('/profile')` → `nav('/lg/profile')`
 * 支持相对路径、外部链接、带参数路径
 */
export function useAppNavigate() {
  const rawNavigate = useNavigate();
  const { basePath } = useNavContext();

  const nav = useCallback(
    (to: NavTo, options?: NavOptions) => {
      // 不处理外部链接
      if (typeof to === 'string' && (to.startsWith('http://') || to.startsWith('https://') || to.startsWith('//'))) {
        window.open(to, '_blank');
        return;
      }

      // 绝对路径 → 添加 basePath
      if (typeof to === 'string' && to.startsWith('/')) {
        // 跳过登录/注册/admin（这些不需要 basePath）
        if (basePath && (
          to.startsWith('/login') || to.startsWith('/register') ||
          to.startsWith('/admin') || to.startsWith('/lg/') || to.startsWith('/lg')
        )) {
          rawNavigate(to, options);
          return;
        }
        rawNavigate(basePath + to, options);
        return;
      }

      // 相对路径或 To 对象
      if (typeof to === 'string') {
        rawNavigate(to, options);
      } else {
        // To 对象：如果有 pathname，拼接 basePath
        const pathname = to.pathname;
        if (pathname && pathname.startsWith('/') && basePath && !pathname.startsWith('/lg')) {
          rawNavigate({ ...to, pathname: basePath + pathname }, options);
        } else {
          rawNavigate(to, options);
        }
      }
    },
    [rawNavigate, basePath]
  );

  return nav;
}
