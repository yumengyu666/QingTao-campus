import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import toast from 'react-hot-toast';
import { FiMessageCircle, FiCheck, FiX, FiClock, FiStar } from 'react-icons/fi';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '等待回复', color: 'bg-amber-100 text-amber-700' },
  accepted: { label: '已接受', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-500' },
  completed: { label: '已完成', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-500' },
};

export default function TradeIntentsPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const token = useAuthStore((s) => s.token);
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch(`/api/trades/intents?role=${role}&pageSize=30`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) setIntents(json.data.list || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, role]);

  const handleAccept = async (id: number) => {
    try {
      const res = await apiFetch(`/api/trades/${id}/accept`, { method: 'PUT' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已接受意向');
        setIntents(prev => prev.map(i => i.id === id ? { ...i, status: 'accepted' } : i));
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await apiFetch(`/api/trades/${id}/reject`, { method: 'PUT' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拒绝');
        setIntents(prev => prev.map(i => i.id === id ? { ...i, status: 'rejected' } : i));
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  const handleComplete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/trades/${id}/complete`, { method: 'PUT' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('交易完成');
        setIntents(prev => prev.map(i => i.id === id ? { ...i, status: 'completed' } : i));
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  const submitReview = async () => {
    if (!reviewingId) return;
    try {
      const res = await apiFetch(`/api/trades/${reviewingId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const json = await res.json();
      if (json.code === 201) {
        toast.success('评价成功');
        setIntents(prev => prev.map(i => i.id === reviewingId ? { ...i, buyerRated: true, sellerRated: true } : i));
        setReviewingId(null);
        setReviewComment('');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  return (
    <div>
      <Header title="交易管理" />
      {/* Role tabs */}
      <div className="flex bg-white dark:bg-[var(--color-card)] mx-4 mt-3 rounded-2xl overflow-hidden">
        <button onClick={() => setRole('buyer')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${role === 'buyer' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          🛒 我想要的
        </button>
        <button onClick={() => setRole('seller')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${role === 'seller' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          💰 卖出的
        </button>
      </div>

      <div className="mx-4 mt-3 pb-8">
        {loading ? <Skeleton.List rows={4} /> :
         intents.length === 0 ? (
          <EmptyState message={role === 'buyer' ? '还没有购买意向' : '还没有人想买你的商品'} />
        ) : (
          <div className="space-y-3">
            {intents.map((item) => {
              const isSeller = role === 'seller';
              const otherUser = isSeller ? item.buyer : item.seller;
              const stat = STATUS_MAP[item.status] || STATUS_MAP.pending;
              return (
                <div key={item.id} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4">
                  {/* Goods info */}
                  {item.goods ? (
                    <div className="flex items-start gap-3 mb-3 cursor-pointer" onClick={() => nav(`/goods/${item.goods.id}`)}>
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                        {item.goods.images?.[0] ? (
                          <img src={typeof item.goods.images[0] === 'string' ? item.goods.images[0] : item.goods.images[0]?.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.goods.title}</p>
                        <p className="text-red-500 font-bold text-sm mt-0.5">¥{item.goods.price}</p>
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${stat.color}`}>{stat.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(item.createdAt)}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-xl">🗑</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-400">商品已删除</p>
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${stat.color}`}>{stat.label}</span>
                      </div>
                    </div>
                  )}

                  {/* Other user info */}
                  <div className="flex items-center gap-2 mb-3">
                    <UserAvatar src={otherUser?.avatarUrl} nickname={otherUser?.nickname || '?'} size="xs" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{otherUser?.nickname}</span>
                    <button onClick={() => nav(`/messages/${otherUser?.id}`)}
                      className="ml-auto flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600">
                      <FiMessageCircle className="text-xs" /> 私信
                    </button>
                  </div>

                  {/* Seller actions */}
                  {isSeller && item.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(item.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500 text-white text-sm font-medium">
                        <FiCheck /> 接受意向
                      </button>
                      <button onClick={() => handleReject(item.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
                        <FiX /> 拒绝
                      </button>
                    </div>
                  )}
                  {isSeller && item.status === 'accepted' && (
                    <button onClick={() => handleComplete(item.id)}
                      className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium">
                      <FiCheck /> 标记交易完成
                    </button>
                  )}
                  {item.status === 'completed' && !(isSeller ? item.sellerRated : item.buyerRated) && (
                    <button onClick={() => { setReviewingId(item.id); setReviewRating(5); setReviewComment(''); }}
                      className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">
                      ⭐ 去评价
                    </button>
                  )}
                  {item.message && (
                    <p className="text-xs text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      💬 {item.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingId && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setReviewingId(null)}>
          <div className="bg-white dark:bg-[var(--color-card)] w-full md:w-96 rounded-t-2xl md:rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">评价交易</h3>
            <div className="flex justify-center gap-2 mb-4">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setReviewRating(star)}
                  className={`text-3xl transition-all ${star <= reviewRating ? 'text-amber-400 scale-110' : 'text-gray-300 dark:text-gray-600'}`}>
                  <FiStar className={star <= reviewRating ? 'fill-amber-400' : ''} />
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
              placeholder="说说你的交易体验吧（选填）"
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm outline-none resize-none h-20 mb-4"
              maxLength={300} />
            <div className="flex gap-2">
              <button onClick={() => setReviewingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-sm font-medium">取消</button>
              <button onClick={submitReview}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium">提交评价</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
