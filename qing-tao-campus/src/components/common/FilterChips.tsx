import { motion } from 'framer-motion';

interface FilterOption {
  key: string;
  label: string;
  active?: boolean;
}

interface Props {
  options: FilterOption[];
  onToggle: (key: string) => void;
  className?: string;
}

export function FilterChips({ options, onToggle, className = '' }: Props) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 scrollbar-hide ${className}`}>
      {options.map((opt) => (
        <motion.button
          key={opt.key}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggle(opt.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            opt.active
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}
