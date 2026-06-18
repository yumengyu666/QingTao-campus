import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiRefreshCw, FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function BarterPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [tab, setTab] = useState<'sent' | 'received'>('received');
  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/barter?role=${tab}&page=${page}&pageSize=10`);
      const json = await res.json();
      if (json.code === 200) { setList(json.data.list || []); setTotal(json.data.total || 0); }
    } catch { toast.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [tab, page]);

  const handleAccept = async (id: number) => {
    try {
      const res = await apiFetch(`/api/barter/${id}/accept`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已接受交换提议'); fetchList(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await apiFetch(`/api/barter/${id}/reject`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已拒绝'); fetchList(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: '待确认', cls: 'bg-yellow-100 text-yellow-700' },
      accepted: { label: '已接受', cls: 'bg-green-100 text-green-700' },
      rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-600' },
      cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500' },
    };
    const m = map[s] || { label: s, cls: 'bg-gray-100' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title="物品交换" />

      <div className="flex border-b border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)]">
        {['received', 'sent'].map(t => (
          <button key={t} onClick={() => { setTab(t as any); setPage(1); }}
            className={`flex-1 py-3 text-sm font-medium ${tab === t ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-gray-500'}`}>
            {t === 'received' ? '收到的提议' : '我发出的'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading ? <div className="text-center py-10 text-gray-400">加载中...</div> :
         list.length === 0 ? <EmptyState message="暂无交换提议" description="在商品详情页点击「提议交换」向卖家发起以物易物" /> :
          list.map(p => (
            <div key={p.id} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">{statusBadge(p.status)}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="truncate font-medium">{p.fromGoods?.title || '物品已删除'}</span>
                    <FiRefreshCw className="text-gray-400 flex-shrink-0" size={14} />
                    <span className="truncate font-medium">{p.toGoods?.title || '物品已删除'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{tab === 'sent' ? `对方: ${p.toUser?.nickname}` : `发起方: ${p.fromUser?.nickname}`}</span>
                    <span>· {formatTime(p.createdAt)}</span>
                  </div>
                  {p.message && <p className="text-xs text-gray-400 mt-1">"{p.message}"</p>}
                </div>
              </div>

              {tab === 'received' && p.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
                  <button onClick={() => handleReject(p.id)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-sm flex items-center justify-center gap-1 hover:bg-gray-50">
                    <FiX size={14} />拒绝
                  </button>
                  <button onClick={() => handleAccept(p.id)}
                    className="flex-1 py-2 rounded-lg bg-green-500 text-white text-sm flex items-center justify-center gap-1 hover:bg-green-600">
                    <FiCheck size={14} />接受
                  </button>
                </div>
              )}
              {p.status === 'accepted' && (
                <button onClick={() => nav(`/messages/${tab === 'sent' ? p.toUserId : p.fromUserId}`)}
                  className="mt-3 w-full py-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm">
                  <FiMessageSquare className="inline mr-1" size={14} />联系对方商议交换细节
                </button>
              )}
            </div>
          ))}
        {total > 10 && <Pagination page={page} total={total} pageSize={10} onChange={setPage} />}
      </div>
    </div>
  );
}
