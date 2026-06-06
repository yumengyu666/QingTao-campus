import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { STATUS_MAP } from '@/types/goods';
import { formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import { FiBox, FiTrash2, FiArrowDown, FiArrowUp, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function MyGoodsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [goods, setGoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchGoods = () => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('keyword', search.trim());
    apiFetch(`/api/users/${user.id}/goods?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (json.code === 200) setGoods(json.data.list || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGoods(); }, [user?.id, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('确定删除该商品吗？')) return;
    try {
      const res = await apiFetch(`/api/goods/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已删除');
        setGoods(prev => prev.filter(g => g.id !== id));
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleOffline = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/goods/${id}/offline`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已下架');
        setGoods(prev => prev.map(g => g.id === id ? { ...g, status: 'offline' } : g));
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleRelist = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/goods/${id}/relist`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已重新上架');
        setGoods(prev => prev.map(g => g.id === id ? { ...g, status: 'approved' } : g));
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  return (
    <div>
      <Header title="我的商品" rightAction={!loading && goods.length > 0 ? <span className="text-xs text-gray-400 font-normal">{goods.length} 件</span> : undefined} />
      <div className="px-4 pt-2 pb-1">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text" placeholder="搜索我的商品..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>
      </div>
      {loading ? (
        <div className="p-4"><Skeleton.List rows={4} /></div>
      ) : goods.length === 0 ? (
        <EmptyState message="还没有发布商品" icon={<FiBox className="text-5xl mb-4" />} />
      ) : (
        <div className="p-4 md:p-0 space-y-2">
          {goods.map((g) => (
            <div key={g.id} onClick={() => navigate(`/goods/${g.id}`)}
              className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm flex-1 truncate">{g.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded text-white ml-2 flex-shrink-0 ${STATUS_MAP[g.status as keyof typeof STATUS_MAP]?.color || 'bg-gray-500'}`}>
                  {STATUS_MAP[g.status as keyof typeof STATUS_MAP]?.label || g.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-red-500 font-bold">¥{g.price}</span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>👁 {g.viewCount}</span>
                  <span>{formatTime(g.createdAt)}</span>
                </div>
              </div>
              {g.status === 'rejected' && g.reviewComment && (
                <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">拒绝原因：{g.reviewComment}</p>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-[var(--color-border)]">
                {g.status === 'approved' && (
                  <button onClick={(e) => handleOffline(e, g.id)}
                    className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1.5 rounded-lg hover:bg-yellow-100 transition-colors">
                    <FiArrowDown /> 下架
                  </button>
                )}
                {g.status === 'offline' && (
                  <button onClick={(e) => handleRelist(e, g.id)}
                    className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                    <FiArrowUp /> 重新上架
                  </button>
                )}
                <button onClick={(e) => handleDelete(e, g.id)}
                  className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors ml-auto">
                  <FiTrash2 /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
