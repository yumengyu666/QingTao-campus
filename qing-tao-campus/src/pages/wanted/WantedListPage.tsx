import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { CampusTag } from '@/components/common/CampusTag';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiPlus, FiSearch, FiDollarSign } from 'react-icons/fi';
import { motion } from 'framer-motion';

const CATEGORIES = ['教材教辅', '电子产品', '运动户外', '生活用品', '服饰鞋包', '乐器设备', '数码配件', '其他'];

export default function WantedListPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [campus, setCampus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (category) params.set('category', category);
    if (campus) params.set('campus', campus);
    apiFetch(`/api/wanted?${params}`).then(r => r.json()).then(json => {
      if (json.code === 200) { setList(json.data.list || []); setTotal(json.data.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [category, campus, page]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title="求购专区" />

      <div className="flex gap-2 p-3 overflow-x-auto bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)]">
        <button onClick={() => { setCategory(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!category ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)]'}`}>全部</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => { setCategory(c); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${category === c ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)]'}`}>{c}</button>
        ))}
      </div>

      <div className="px-4 py-2 flex gap-2 text-xs">
        {['', '科学校区', '东风校区'].map(c => (
          <button key={c} onClick={() => { setCampus(c); setPage(1); }}
            className={`px-2 py-1 rounded ${campus === c ? 'text-[var(--color-primary)] font-medium' : 'text-gray-500'}`}>{c || '全部校区'}</button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading ? <div className="text-center py-10 text-gray-400">加载中...</div> :
         list.length === 0 ? <EmptyState message="暂无求购信息" description="成为第一个发布求购的人吧" /> :
          list.map(w => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/wanted/${w.id}`)}
              className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl flex-shrink-0">🔍</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{w.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {w.category && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-[var(--color-card-hover)] rounded">{w.category}</span>}
                    <CampusTag campus={w.campus} />
                    {w.budget && <span className="text-amber-600 font-medium"><FiDollarSign className="inline" size={12} />{w.budget}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{w.user?.nickname}</span>
                    <span>{formatTime(w.createdAt)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        {total > 20 && <Pagination page={page} total={total} pageSize={20} onChange={setPage} />}
      </div>

      <button onClick={() => navigate('/publish/wanted')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform z-30">
        <FiPlus />
      </button>
    </div>
  );
}
