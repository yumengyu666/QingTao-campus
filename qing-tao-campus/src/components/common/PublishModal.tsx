import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit3, FiPackage, FiFileText, FiSearch, FiHelpCircle, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface PublishModalProps {
  show: boolean;
  onClose: () => void;
}

const actions = [
  { icon: FiEdit3, label: '发笔记', desc: '图文/视频分享校园生活', color: '#ff2442', path: '/explore/new' },
  { icon: FiPackage, label: '发商品', desc: '出售闲置二手物品', color: '#07c160', path: '/publish/goods' },
  { icon: FiFileText, label: '发帖子', desc: '社区交流讨论', color: '#576b95', path: '/publish/post' },
  { icon: FiSearch, label: '失物招领', desc: '发布失物或捡到信息', color: '#1485ee', path: '/publish/lostfound' },
  { icon: FiHelpCircle, label: '去提问', desc: '校园答疑求助', color: '#e6a23c', path: '/qa' },
];

export default function PublishModal({ show, onClose }: PublishModalProps) {
  const navigate = useNavigate();

  const handleClick = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Title */}
            <div className="px-5 pb-2 flex items-center justify-between">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">发布</span>
              <button onClick={onClose} className="p-1">
                <FiX className="text-xl text-gray-400" />
              </button>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-3 gap-3 px-5 pb-8 pt-2">
              {actions.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleClick(item.path)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="text-2xl" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-gray-400 leading-tight text-center">
                      {item.desc}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Cancel */}
            <button
              onClick={onClose}
              className="w-full py-3 text-sm text-gray-500 border-t border-gray-100 dark:border-gray-800 font-medium"
            >
              取消
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
