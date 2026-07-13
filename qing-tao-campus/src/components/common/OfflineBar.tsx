import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBar() {
  const [status, setStatus] = useState<'online' | 'offline' | 'restored'>('online');

  const handleOnline = useCallback(() => {
    setStatus('restored');
    window.dispatchEvent(new CustomEvent('online-restored'));
    setTimeout(() => setStatus('online'), 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setStatus('offline');
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) {
      setStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return (
    <AnimatePresence>
      {status === 'offline' && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-2.5 text-center text-sm font-medium shadow-lg"
        >
          ⚠️ 当前处于离线状态，部分功能不可用
        </motion.div>
      )}
      {status === 'restored' && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-500 text-white px-4 py-2.5 text-center text-sm font-medium shadow-lg"
        >
          ✅ 网络已恢复
        </motion.div>
      )}
    </AnimatePresence>
  );
}
