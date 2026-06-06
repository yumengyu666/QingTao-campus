import { motion } from 'framer-motion';
import { FiPlus, FiEdit3, FiShoppingCart } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const actions = [
  { icon: FiEdit3, label: '发布商品', path: '/goods/create' },
  { icon: FiShoppingCart, label: '发布求购', path: '/goods/create?type=buy' },
];

export function FloatingAction() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {open && actions.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ delay: (actions.length - i) * 0.05 }}
          onClick={() => { navigate(action.path); setOpen(false); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 shadow-lg text-sm font-medium active:scale-95 transition-transform"
        >
          <action.icon className="text-indigo-500" size={16} />
          {action.label}
        </motion.button>
      ))}
      <motion.button
        animate={{ rotate: open ? 45 : 0 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-indigo-500 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
      >
        <FiPlus size={24} />
      </motion.button>
    </div>
  );
}
