import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    const goOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const dismissBanner = () => setShowOfflineBanner(false);

  return { isOnline, showOfflineBanner, dismissBanner };
}
