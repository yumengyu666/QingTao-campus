import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit3, FiShoppingCart } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';

const actions = [
  { icon: FiEdit3, label: '发布商品', path: '/publish/goods' },
  { icon: FiShoppingCart, label: '发布求购', path: '/publish/wanted' },
];

export function FloatingAction() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 md:bottom-8">
        <AnimatePresence>
          {open &&
            actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.8 }}
                transition={{
                  delay: (actions.length - 1 - i) * 0.05,
                  duration: 0.25,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => handleAction(action.path)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-[var(--color-card)] shadow-lg border border-gray-100 dark:border-[var(--color-border)] text-sm font-medium text-gray-700 dark:text-[var(--color-text)] hover:shadow-xl active:scale-95 transition-all"
              >
                <action.icon className="text-indigo-500" size={16} />
                {action.label}
              </motion.button>
            ))}
        </AnimatePresence>

        <motion.button
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center active:scale-90 transition-all"
          aria-label={open ? '关闭菜单' : '打开菜单'}
        >
          <FiPlus size={24} strokeWidth={2.5} />
        </motion.button>
      </div>
    </>
  );
}
