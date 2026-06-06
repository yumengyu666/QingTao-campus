import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiSearch } from 'react-icons/fi';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--color-bg)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-[var(--color-card)] flex items-center justify-center"
        >
          <FiSearch className="text-5xl text-gray-300 dark:text-gray-600" />
        </motion.div>

        <h1 className="text-6xl font-black text-gray-200 dark:text-gray-700 mb-3">
          404
        </h1>
        <p className="text-gray-500 dark:text-[var(--color-text-secondary)] text-sm mb-2">
          页面不存在或已被移除
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mb-8">
          你访问的页面可能已经下架、被删除或地址输入有误
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/25"
          >
            <FiHome className="text-sm" />
            返回首页
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
