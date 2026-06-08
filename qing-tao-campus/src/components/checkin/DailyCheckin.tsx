import { useState, useEffect } from 'react';
import { apiFetch } from '@/utils/api';
import { FiCheck, FiGift } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function DailyCheckin() {
  const [status, setStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneMsg, setMilestoneMsg] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/checkin');
      const json = await res.json();
      if (json.code === 200) setStatus(json.data);
    } catch {}
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleCheckin = async () => {
    setChecking(true);
    try {
      const res = await apiFetch('/api/checkin', { method: 'POST' });
      const json = await res.json();
      if (json.code === 201) {
        setStatus({ checkedToday: true, streak: json.data.streak });
        toast.success(`签到成功！连续${json.data.streak}天`);
        if (json.data.milestone) {
          setMilestoneMsg(json.data.milestone);
          setShowMilestone(true);
          setTimeout(() => setShowMilestone(false), 3000);
        }
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    finally { setChecking(false); }
  };

  const streak = status?.streak || 0;
  const days = ['一', '二', '三', '四', '五', '六', '七'];

  return (
    <>
      <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-4 mx-4 mt-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1">
              <FiGift className="text-amber-500" /> 每日签到
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">已连续签到 <span className="font-bold text-[var(--color-primary)]">{streak}</span> 天</p>
          </div>
          <button
            onClick={handleCheckin}
            disabled={status?.checkedToday || checking}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              status?.checkedToday
                ? 'bg-green-50 text-green-600 cursor-default'
                : 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95'
            }`}
          >
            {status?.checkedToday ? <><FiCheck className="inline mr-1" size={14} />已签到</> : checking ? '签到中...' : '签到'}
          </button>
        </div>

        {/* 7天进度条 */}
        <div className="flex gap-1.5 mt-3">
          {days.map((d, i) => (
            <div key={d} className="flex-1">
              <div className={`h-1.5 rounded-full ${i < (streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0)) ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
              <p className={`text-[10px] text-center mt-0.5 ${i < (streak % 7 || 0) || (streak > 0 && streak % 7 === 0 && i === 6) ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showMilestone && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold">
            {milestoneMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
