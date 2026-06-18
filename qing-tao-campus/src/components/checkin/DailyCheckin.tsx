import { useState, useEffect } from 'react';
import { apiFetch } from '@/utils/api';
import { FiCheck, FiGift, FiZap } from 'react-icons/fi';
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

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCheckin = async () => {
    setChecking(true);
    try {
      const res = await apiFetch('/api/checkin', { method: 'POST' });
      const json = await res.json();
      if (json.code === 201) {
        setStatus({ checkedToday: true, streak: json.data.streak });
        toast.success(`签到成功！连续 ${json.data.streak} 天`, {
          icon: '🎉',
        });
        if (json.data.milestone) {
          setMilestoneMsg(json.data.milestone);
          setShowMilestone(true);
          setTimeout(() => setShowMilestone(false), 3000);
        }
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setChecking(false);
    }
  };

  const streak = status?.streak || 0;
  const days = ['一', '二', '三', '四', '五', '六', '日'];

  // Compute which days are checked (current week streak)
  const weekStreak = streak % 7 || (streak > 0 ? 7 : 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-4 mx-4 mt-3 shadow-sm border border-gray-50 dark:border-[var(--color-border)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                <FiGift className="text-amber-500" size={14} />
              </span>
              每日签到
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              已连续签到{' '}
              <span className="font-bold text-indigo-500 dark:text-indigo-400">{streak}</span>{' '}
              天
              {streak >= 7 && (
                <span className="ml-1 text-amber-500">
                  <FiZap className="inline" size={12} />
                </span>
              )}
            </p>
          </div>
          <motion.button
            whileTap={status?.checkedToday ? undefined : { scale: 0.92 }}
            onClick={handleCheckin}
            disabled={status?.checkedToday || checking}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              status?.checkedToday
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/20'
            }`}
          >
            {checking ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                签到中
              </span>
            ) : status?.checkedToday ? (
              <>
                <FiCheck className="inline mr-1" size={14} />
                已签到
              </>
            ) : (
              '签到'
            )}
          </motion.button>
        </div>

        {/* 7-day streak bar */}
        <div className="flex gap-1.5 mt-4">
          {days.map((d, i) => {
            const isChecked = i < weekStreak;
            return (
              <div key={d} className="flex-1">
                <motion.div
                  initial={false}
                  animate={{
                    scaleY: isChecked ? 1 : 0.5,
                    backgroundColor: isChecked ? undefined : undefined,
                  }}
                  className={`h-1.5 rounded-full transition-colors ${
                    isChecked
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-sm shadow-amber-400/20'
                      : 'bg-gray-150 dark:bg-gray-700'
                  }`}
                />
                <p
                  className={`text-[10px] text-center mt-1 transition-colors ${
                    isChecked ? 'text-amber-500 font-semibold' : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {d}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Milestone Toast */}
      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-amber-500/30 text-sm font-bold"
          >
            🎉 {milestoneMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
