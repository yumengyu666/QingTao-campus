import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/common/Skeleton';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { FiMessageCircle, FiTrash2, FiDollarSign, FiMapPin, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function WantedDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/wanted/${id}`).then(r => r.json()).then(j => {
      if (j.code === 200) setItem(j.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('确定删除吗？')) return;
    try {
      const res = await apiFetch(`/api/wanted/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已删除'); nav('/wanted'); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  if (loading) return <div><Header title="求购详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!item) return <div><Header title="求购详情" /><p className="text-center text-gray-400 py-20">信息不存在或已删除</p></div>;

  const isOwner = currentUser?.id === item.userId;
  const images = item.images || [];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title="求购详情" />
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-5">
          <h1 className="text-xl font-bold">{item.title}</h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {item.category && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"><FiTag className="inline mr-1" size={10} />{item.category}</span>}
            {item.campus && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"><FiMapPin className="inline mr-1" size={10} />{item.campus}</span>}
            {item.budget && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium"><FiDollarSign className="inline mr-1" size={10} />预算 ¥{item.budget}</span>}
          </div>
          {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 whitespace-pre-wrap">{item.description}</p>}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {images.map((img: string, i: number) => (
                <img key={i} src={img} alt="" className="rounded-xl w-full aspect-square object-cover" loading="lazy" decoding="async" />
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-[var(--color-border)]">
            <div className="flex-1">
              <p className="text-sm font-medium">{item.user?.nickname}</p>
              <p className="text-xs text-gray-400">{formatTime(item.createdAt)} · {item.viewCount} 次浏览</p>
            </div>
            {!isOwner && (
              <button onClick={() => nav(`/messages/${item.userId}`)}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium flex items-center gap-1">
                <FiMessageCircle size={14} />私信
              </button>
            )}
          </div>
        </div>

        {isOwner && (
          <button onClick={handleDelete}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-1 hover:bg-red-50">
            <FiTrash2 size={14} />删除
          </button>
        )}
      </div>
    </div>
  );
}
