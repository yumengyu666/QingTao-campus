import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import toast from 'react-hot-toast';
import { FiCheck, FiX } from 'react-icons/fi';

export default function AdminContentPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetch = () => {
    setLoading(true);
    apiFetch('/api/admin/content/pending')
      .then(r => r.json())
      .then(j => { if (j.code === 200) setItems(j.data.list || []); })
      .catch(() => toast.error('加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (type: string, id: number) => {
    try {
      const res = await apiFetch(`/api/admin/content/${type}/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已通过');
        setItems(prev => prev.filter(i => !(i._type === type && i.id === id)));
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  const handleReject = async (type: string, id: number) => {
    if (!rejectReason.trim()) { toast.error('请输入拒绝原因'); return; }
    try {
      const res = await apiFetch(`/api/admin/content/${type}/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拒绝');
        setItems(prev => prev.filter(i => !(i._type === type && i.id === id)));
        setRejectingId(null);
        setRejectReason('');
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  const typeLabel = (t: string) => t === 'goods' ? '🛒 商品' : t === 'post' ? '📋 帖子' : '🔍 失物招领';

  return (
    <div>
      <Header title="内容审核" />
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-[var(--color-card-hover)] rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">暂无待审核内容 🎉</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item._type}-${item.id}`} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">{typeLabel(item._type)}</span>
                      <span className="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
                    </div>
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    {item.content && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.content}</p>}
                    <p className="text-xs text-gray-400 mt-1">作者：{item.user?.nickname}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button onClick={() => handleApprove(item._type, item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors">
                      <FiCheck /> 通过
                    </button>
                    {rejectingId === `${item._type}-${item.id}` ? (
                      <div className="flex items-center gap-1">
                        <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="拒绝原因" className="w-24 px-2 py-1 text-xs rounded border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card-hover)] outline-none" autoFocus />
                        <button onClick={() => handleReject(item._type, item.id)} className="px-2 py-1 rounded bg-red-500 text-white text-xs">确认</button>
                        <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="text-gray-400 text-xs"><FiX /></button>
                      </div>
                    ) : (
                      <button onClick={() => setRejectingId(`${item._type}-${item.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors">
                        <FiX /> 拒绝
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
