import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiCalendar, FiCheck, FiX, FiClock, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ReservationsPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer');
  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reservations?role=${tab}&page=${page}&pageSize=10`);
      const json = await res.json();
      if (json.code === 200) {
        setList(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch { toast.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [tab, page]);

  const handleAccept = async (id: number) => {
    try {
      const res = await apiFetch(`/api/reservations/${id}/accept`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已接受'); fetchList(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await apiFetch(`/api/reservations/${id}/reject`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已拒绝'); fetchList(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确定取消预约吗？')) return;
    try {
      const res = await apiFetch(`/api/reservations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已取消'); fetchList(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: '待确认', cls: 'bg-yellow-100 text-yellow-700' },
      accepted: { label: '已接受', cls: 'bg-green-100 text-green-700' },
      rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-600' },
      cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500' },
      expired: { label: '已过期', cls: 'bg-gray-100 text-gray-400' },
    };
    const m = map[s] || { label: s, cls: 'bg-gray-100' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header title="预约管理" />

      <div className="flex border-b border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)]">
        {['buyer', 'seller'].map(t => (
          <button key={t} onClick={() => { setTab(t as any); setPage(1); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-gray-500'
            }`}
          >
            {t === 'buyer' ? '我预约的' : '预约我的'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 animate-pulse">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-700 rounded" />
            </div>
          ))}</div>
        ) : list.length === 0 ? (
          <EmptyState message="暂无预约记录" description={tab === 'buyer' ? '去商品详情页预约看货吧' : '当有人预约你的商品时会在这里显示'} />
        ) : (
          list.map(r => (
            <div key={r.id} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  onClick={() => nav(`/goods/${r.goodsId}`)}
                  className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-[var(--color-card-hover)] flex-shrink-0 overflow-hidden cursor-pointer"
                >
                  {r.goods?.images ? (
                    <img src={JSON.parse(r.goods.images)[0]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(r.status)}
                    <span className="text-xs text-gray-400"><FiClock className="inline mr-0.5" size={12} />{formatTime(r.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium truncate cursor-pointer" onClick={() => navigate(`/goods/${r.goodsId}`)}>
                    {r.goods?.title || '商品已删除'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {tab === 'buyer' ? `卖家: ${r.seller?.nickname || '未知'}` : `买家: ${r.buyer?.nickname || '未知'}`}
                  </p>
                  {r.message && <p className="text-xs text-gray-400 mt-1 truncate">"{r.message}"</p>}
                </div>
              </div>

              {tab === 'seller' && r.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
                  <button onClick={() => handleReject(r.id)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm flex items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FiX size={14} />拒绝
                  </button>
                  <button onClick={() => handleAccept(r.id)}
                    className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm flex items-center justify-center gap-1 hover:opacity-90">
                    <FiCheck size={14} />接受
                  </button>
                </div>
              )}

              {tab === 'buyer' && r.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
                  <button onClick={() => handleCancel(r.id)}
                    className="w-full py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                    取消预约
                  </button>
                </div>
              )}

              {r.status === 'accepted' && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
                  <button onClick={() => nav(`/messages/${tab === 'buyer' ? r.sellerId : r.buyerId}`)}
                    className="w-full py-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm flex items-center justify-center gap-1 hover:bg-[var(--color-primary)]/20">
                    <FiMessageSquare size={14} />联系{tab === 'buyer' ? '卖家' : '买家'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {total > 10 && <Pagination page={page} total={total} pageSize={10} onChange={setPage} />}
      </div>
    </div>
  );
}
