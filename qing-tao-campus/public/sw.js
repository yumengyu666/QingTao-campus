/**
 * Service Worker — 离线缓存策略
 *
 * 策略: Stale-While-Revalidate
 * - 静态资源: 缓存优先，后台更新
 * - API请求: 网络优先，离线显示缓存
 * - 图片: 缓存优先
 *
 * 注册方式: 在 main.tsx 中 import './registerSW';
 */

/// <reference lib="webworker" />

const CACHE_NAME = 'qingtao-v1';
const STATIC_CACHE = 'qingtao-static-v1';
const IMAGE_CACHE = 'qingtao-images-v1';

// 需要预缓存的资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// 安装：预缓存关键资源
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return (self as any).skipWaiting();
    }),
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key)),
      );
    }).then(() => {
      return (self as any).clients.claim();
    }),
  );
});

// 请求拦截
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  // API 请求：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 图片请求：缓存优先
  if (
    url.pathname.startsWith('/uploads/') ||
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpe?g|gif|webp|svg|ico)$/i)
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 静态资源：Stale-While-Revalidate
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|woff2?)$/i)
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 默认：Network First
  event.respondWith(networkFirst(request));
});

// ─── 缓存策略 ───

/** 缓存优先：先查缓存，缓存未命中才走网络 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 离线且无缓存：返回占位图
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#e5e7eb" width="200" height="200"/><text fill="#9ca3af" font-size="14" text-anchor="middle" x="100" y="105">离线模式</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } },
      );
    }
    throw new Error('Offline');
  }
}

/** 网络优先：先走网络，失败则回退缓存 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ code: 0, message: '当前处于离线状态，请联网后重试', data: null }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** Stale-While-Revalidate：先返回缓存，后台更新 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// 类型声明
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}
