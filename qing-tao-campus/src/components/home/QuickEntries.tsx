import { useNavigate } from 'react-router-dom';
import { FiSearch, FiRefreshCw, FiCalendar } from 'react-icons/fi';

const entries = [
  { label: '求购专区', icon: '🔍', path: '/wanted', color: 'from-amber-400 to-orange-400', desc: '发布求购' },
  { label: '预约管理', icon: '📅', path: '/reservations', color: 'from-blue-400 to-cyan-400', desc: '预约看货' },
  { label: '物品交换', icon: '🔄', path: '/barter', color: 'from-green-400 to-emerald-400', desc: '以物易物' },
  { label: '每日签到', icon: '🎁', path: '/', color: 'from-pink-400 to-rose-400', desc: '连续签到' },
];

export function QuickEntries() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3">
      {entries.map(e => (
        <button key={e.label} onClick={() => navigate(e.path)}
          className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${e.color} flex items-center justify-center text-xl shadow-md`}>
            {e.icon}
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-[var(--color-text)]">{e.label}</span>
        </button>
      ))}
    </div>
  );
}
