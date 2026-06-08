import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { apiFetch } from '@/utils/api';
import { motion } from 'framer-motion';
import { FiLock } from 'react-icons/fi';

export default function BadgesPage() {
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [myBadgeIds, setMyBadgeIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/badges/all').then(r => r.json()),
      apiFetch('/api/badges').then(r => r.json()),
    ]).then(([allJson, myJson]) => {
      if (allJson.code === 200) setAllBadges(allJson.data || []);
      if (myJson.code === 200) setMyBadgeIds(new Set((myJson.data || []).map((b: any) => b.id)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title="成就徽章" />
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {allBadges.map(b => {
            const earned = myBadgeIds.has(b.id);
            return (
              <motion.div key={b.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className={`relative rounded-2xl p-4 text-center transition-opacity ${earned ? 'bg-white dark:bg-[var(--color-card)] shadow-sm' : 'bg-gray-50 dark:bg-[var(--color-card-hover)] opacity-50'}`}>
                <div className="text-3xl mb-2">{b.icon}</div>
                <p className="text-xs font-medium text-gray-700 dark:text-[var(--color-text)]">{b.name}</p>
                <p className="text-[10px] text-gray-400 mt-1">{b.description}</p>
                {!earned && (
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5">
                    <FiLock className="text-gray-400" size={18} />
                  </div>
                )}
              </motion.div>
            );
          })}
          {!loading && allBadges.length === 0 && (
            <div className="col-span-3 text-center py-10 text-gray-400 text-sm">暂无徽章数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
