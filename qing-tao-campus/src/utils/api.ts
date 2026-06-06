import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// 统一 fetch 封装：自动附加 Token + 401/封号处理 + GET 请求自动重试
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = storage.getToken();
  const headers = new Headers(options?.headers);
  const isGet = !options?.method || options.method === 'GET';

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 避免重复前缀：如果 URL 已经以 API_BASE 开头就直接使用
  const urlBase = url.startsWith(API_BASE) ? '' : API_BASE;
  const fullUrl = url.startsWith('http') ? url : `${urlBase}${url}`;

  const doFetch = () => fetch(fullUrl, { ...options, headers });

  let res = await doFetch();

  // GET 请求自动重试 1 次（SQLite 并发繁忙等瞬时错误）
  if (isGet && !res.ok && res.status >= 500) {
    await new Promise(r => setTimeout(r, 300));
    res = await doFetch();
  }

  // 401 → 尝试刷新 Token，失败后踢到登录页（登录接口本身除外）
  if (res.status === 401 && !url.includes('/auth/login')) {
    const refreshToken = storage.getRefreshToken();
    if (refreshToken && !url.includes('/auth/refresh')) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (refreshJson.code === 200 && refreshJson.data?.token) {
            storage.setToken(refreshJson.data.token);
            if (refreshJson.data.refreshToken) storage.setRefreshToken(refreshJson.data.refreshToken);
            // 重试原请求
            headers.set('Authorization', `Bearer ${refreshJson.data.token}`);
            return fetch(fullUrl, { ...options, headers });
          }
        }
      } catch {}
    }
    storage.removeToken();
    storage.removeUser();
    storage.removeRefreshToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  // 403 封号 → 强制下线
  if (res.status === 403) {
    try {
      const clone = res.clone();
      const body = await clone.json();
      if (body.message?.includes('封禁')) {
        storage.removeToken();
        storage.removeUser();
        storage.removeRefreshToken();
        sessionStorage.setItem('ban_message', body.message);
        window.location.href = '/login?banned=1';
        throw new Error('Account banned');
      }
    } catch {
      // Not JSON or not ban-related, ignore
    }
  }

  // 429 限流 → 弹窗提示
  if (res.status === 429) {
    try {
      const { default: toast } = await import('react-hot-toast');
      const clone = res.clone();
      const body = await clone.json();
      toast.error(body.message || '操作太频繁了，等待几秒后继续', { duration: 3000 });
    } catch { /* ignore */ }
  }

  return res;
}
