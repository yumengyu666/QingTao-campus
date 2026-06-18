import { useThemeStore, THEMES, type ThemeName } from '@/stores/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDroplet, FiX, FiCheck } from 'react-icons/fi';
import { useState } from 'react';

export function ThemePicker() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors relative group"
        title="切换主题"
        aria-label="切换主题"
      >
        <div
          className="w-4 h-4 rounded-full shadow-sm transition-transform group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[var(--color-bg-section)] rounded-2xl p-5 w-full max-w-sm shadow-xl border border-gray-100 dark:border-[var(--color-border-default)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-[var(--color-text-primary)]">选择主题</h3>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">选择你喜欢的色彩方案</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="关闭">
                  <FiX size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(THEMES) as [ThemeName, (typeof THEMES)[ThemeName]][]).map(([key, cfg]) => {
                  const isActive = theme.name === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setTheme(key); setOpen(false); }}
                      className={`relative p-3 rounded-xl text-center transition-all duration-200 ${isActive ? 'ring-2 ring-offset-2 scale-105' : 'hover:scale-[1.03] hover:shadow-md'}`}
                      style={{ backgroundColor: `${cfg.primary}10`, ringColor: cfg.primary }}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: cfg.primary }}>
                          <FiCheck size={12} className="text-white" />
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-2xl mx-auto mb-2.5 shadow-md flex items-center justify-center text-xl"
                        style={{ background: `linear-gradient(135deg, ${cfg.primary}, ${cfg.accent})` }}>
                        {cfg.icon}
                      </div>
                      <span className="text-xs font-semibold block mb-0.5" style={{ color: cfg.primaryDark }}>{cfg.label}</span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)] leading-tight block">{cfg.description}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

