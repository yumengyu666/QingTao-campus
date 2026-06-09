import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
      toast.success('网络已恢复', { duration: 2000 });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
      toast.error('网络连接已断开', { duration: 0, id: 'offline-toast' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center text-xs py-1.5 font-medium">
      当前处于离线状态，部分功能不可用
    </div>
  );
}
