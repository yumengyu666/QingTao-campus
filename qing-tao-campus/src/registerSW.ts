/**
 * Service Worker 注册模块
 * 在 main.tsx 中导入: import './registerSW';
 */
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Service Worker registered;
          // 监听更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 有新版本可用，提示用户刷新
                // New version available;
                // 可以在这里触发 UI 提示
              }
            });
          });

          // #49 浏览器推送订阅
          subscribePush(registration);
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err.message);
        });
    });

    // 监听 SW 控制权变更
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

/** #49: 浏览器推送通知订阅 */
async function subscribePush(registration: ServiceWorkerRegistration) {
  if (!('PushManager' in window)) {
    console.info('[Push] PushManager not available in this browser');
    return;
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    console.info('[Push] Notification permission denied');
    return;
  }

  if (permission === 'default') {
    const granted = await Notification.requestPermission();
    if (granted !== 'granted') {
      console.info('[Push] Notification permission not granted');
      return;
    }
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
      ),
    });

    // 发送订阅到后端
    const token = localStorage.getItem('qingtao_token');
    if (!token) return;

    await fetch('/api/notifications/push-subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription }),
    });
    console.info('[Push] Subscription sent to server');
  } catch (err: any) {
    console.warn('[Push] Subscription failed:', err.message);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
