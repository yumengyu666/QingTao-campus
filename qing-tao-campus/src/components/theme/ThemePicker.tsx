import { useThemeStore, THEMES, ThemeName } from '@/stores/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPalette, FiX } from 'react-icons/fi';
import { useState } from 'react';

export function ThemePicker() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="切换主题">
        <FiPalette className="text-lg" style={{ color: theme.primary }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">选择主题</h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <FiX size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(THEMES) as [ThemeName, typeof THEMES['emerald']][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => { setTheme(key); setOpen(false); }}
                    className={`p-3 rounded-xl text-center transition-all ${
                      theme.name === key ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-105' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: `${cfg.primary}15` }}>
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${cfg.primary}, ${cfg.accent})` }} />
                    <span className="text-xs font-medium" style={{ color: cfg.primary }}>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
