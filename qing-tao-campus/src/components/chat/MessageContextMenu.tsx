import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy, FiCornerUpLeft, FiTrash2, FiShare2 } from 'react-icons/fi';

interface MessageContextMenuProps {
  show: boolean;
  position: { x: number; y: number };
  msg: any;
  isMine: boolean;
  onClose: () => void;
  onCopy: (msg: any) => void;
  onReply: (msg: any) => void;
  onRecall: (msg: any) => void;
  onDelete: (msg: any) => void;
  onForward: (msg: any) => void;
}

export default function MessageContextMenu({
  show, position, msg, isMine, onClose, onCopy, onReply, onRecall, onDelete, onForward,
}: MessageContextMenuProps) {
  const canRecall = isMine &&
    msg.type === 'text' &&
    !msg.recalledAt &&
    Date.now() - new Date(msg.createdAt).getTime() < 2 * 60 * 1000;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-black/5 dark:border-white/10 py-1 min-w-[140px]"
            style={{
              left: Math.min(position.x, window.innerWidth - 160),
              top: Math.min(position.y, window.innerHeight - 250),
            }}
          >
            <button
              onClick={() => { onCopy(msg); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiCopy className="text-base" />
              <span>复制</span>
            </button>

            <button
              onClick={() => { onReply(msg); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiCornerUpLeft className="text-base" />
              <span>引用</span>
            </button>

            {canRecall && (
              <button
                onClick={() => { onRecall(msg); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                <span className="text-base">↩</span>
                <span>撤回</span>
              </button>
            )}

            <button
              onClick={() => { onForward(msg); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiShare2 className="text-base" />
              <span>转发</span>
            </button>

            <div className="border-t border-black/5 dark:border-white/5 my-0.5" />

            <button
              onClick={() => { onDelete(msg); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <FiTrash2 className="text-base" />
              <span>删除</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
