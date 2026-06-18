import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion } from 'framer-motion';
import { FiPlus, FiTrash2, FiLock, FiGlobe } from 'react-icons/fi';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LazyImage } from '@/components/common/LazyImage';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function CollectionsPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [collections, setCollections] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/collections');
        const json = await res.json();
        if (json.code === 200) setCollections(json.data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      const res = await apiFetch('/api/collections', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
      const json = await res.json();
      if (json.code === 201 || json.code === 200) {
        setCollections(prev => [json.data, ...prev]);
        setNewName('');
        setShowCreate(false);
        toast.success('创建成功');
      }
    } catch { toast.error('创建失败'); }
  };

  const remove = async (id: number) => {
    if (!confirm('确定删除这个收藏夹吗？')) return;
    try {
      await apiFetch(`/api/collections/${id}`, { method: 'DELETE' });
      setCollections(prev => prev.filter(c => c.id !== id));
      toast.success('已删除');
    } catch { toast.error('删除失败'); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <MobileHeader title="我的收藏夹" />

      <div className="p-4">
        {collections.map(c => (
          <motion.div key={c.id} whileTap={{ scale: 0.98 }}
            onClick={() => nav(`/collections/${c.id}`)}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 flex items-center gap-4 shadow-sm cursor-pointer">
            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl overflow-hidden">
              {c.coverUrl ? <LazyImage src={c.coverUrl} alt="" className="w-full h-full rounded-lg object-cover" /> : '📁'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                {c.isPublic ? <FiGlobe className="text-gray-400 text-xs" /> : <FiLock className="text-gray-400 text-xs" />}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{c.postCount || 0} 篇笔记</div>
            </div>
            <button onClick={e => { e.stopPropagation(); remove(c.id); }} className="p-2 text-gray-400 hover:text-red-500">
              <FiTrash2 />
            </button>
          </motion.div>
        ))}

        {!loading && collections.length === 0 && (
          <EmptyState
            message="还没有收藏夹"
            description="收藏笔记时创建你的第一个收藏夹"
            icon={<span className="text-4xl">⭐</span>}
          />
        )}

        {/* Create button */}
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
            <FiPlus /> 新建收藏夹
          </button>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm space-y-3">
            <input value={newName} onChange={e => setNewName(e.target.value.slice(0, 20))}
              placeholder="收藏夹名称"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none text-gray-700 dark:text-gray-300" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg">取消</button>
              <button onClick={create} className="flex-1 py-2 text-sm text-white bg-indigo-500 rounded-lg">创建</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
