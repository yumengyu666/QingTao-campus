import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import { FiFileText, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function MyPostsPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const user = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('keyword', search.trim());
    apiFetch(`/api/users/${user.id}/posts?${params.toString()}`)
      .then(r => r.json())
      .then(json => { if (json.code === 200) setPosts(json.data.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('确定删除该帖子吗？')) return;
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已删除');
        setPosts(prev => prev.filter(p => p.id !== id));
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const statusMap: Record<string, string> = { pending: '审核中', approved: '已通过', rejected: '已拒绝' };
  const statusColor: Record<string, string> = { pending: 'bg-yellow-500', approved: 'bg-green-500', rejected: 'bg-red-500' };

  return (
    <div>
      <Header title="我的帖子" rightAction={!loading && posts.length > 0 ? <span className="text-xs text-gray-400 font-normal">{posts.length} 篇</span> : undefined} />
      <div className="px-4 pt-2 pb-1">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text" placeholder="搜索我的帖子..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400 transition-colors"
          />
        </div>
      </div>
      {loading ? <div className="p-4"><Skeleton.List rows={3} /></div>
      : posts.length === 0 ? <EmptyState message="还没有发布帖子" icon={<FiFileText className="text-5xl mb-4" />} />
      : (
        <div className="p-4 md:p-0 space-y-2">
          {posts.map((p) => (
            <div key={p.id} onClick={() => nav(`/square/post/${p.id}`)}
              className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm flex-1 truncate">{p.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded text-white ml-2 flex-shrink-0 ${statusColor[p.status] || 'bg-gray-500'}`}>
                  {statusMap[p.status] || p.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>👁 {p.viewCount}</span>
                <span>{formatTime(p.createdAt)}</span>
              </div>
              {p.status === 'rejected' && p.reviewComment && (
                <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">拒绝原因：{p.reviewComment}</p>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-[var(--color-border)]">
                <button onClick={(e) => handleDelete(e, p.id)}
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
