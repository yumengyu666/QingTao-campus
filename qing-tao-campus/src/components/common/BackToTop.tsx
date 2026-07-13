import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowUp } from 'react-icons/fi';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  const getScrollTop = useCallback(() => {
    const main = document.getElementById('lg-main');
    if (main) return main.scrollTop;
    return window.scrollY;
  }, []);

  const handleScroll = useCallback(() => {
    setVisible(getScrollTop() > 400);
  }, [getScrollTop]);

  useEffect(() => {
    const main = document.getElementById('lg-main');
    const target = main || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const scrollToTop = () => {
    const main = document.getElementById('lg-main');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={scrollToTop}
          className="fixed bottom-24 left-4 md:bottom-8 md:left-[17rem] z-40 w-10 h-10 rounded-xl bg-white dark:bg-[var(--color-card)] shadow-md border border-gray-100 dark:border-[var(--color-border)] flex items-center justify-center hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 active:scale-90 transition-all group"
          aria-label="回到顶部"
        >
          <FiArrowUp className="text-gray-400 group-hover:text-indigo-500 transition-colors" size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
