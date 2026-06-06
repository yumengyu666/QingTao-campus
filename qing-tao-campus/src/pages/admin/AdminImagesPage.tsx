import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiCheck, FiX, FiZoomIn, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

/**
 * 图片审核页 — 管理员审核用户上传的图片
 *
 * 使用接口：
 * GET    /api/admin/images?status=pending|approved|rejected&page=
 * POST   /api/admin/images/:id/approve
 * POST   /api/admin/images/:id/reject  { reason }
 */

type FilterType = 'pending' | 'approved' | 'rejected';

export default function AdminImagesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/images?status=${filter}&page=${page}`);
      const json = await res.json();
      if (json.code === 200) {
        setItems(json.data.list || []);
        setTotal(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // Count pending
  useEffect(() => {
    apiFetch('/api/admin/images?status=pending&pageSize=1')
      .then(r => r.json())
      .then(j => { if (j.code === 200) setCounts(prev => ({ ...prev, pending: j.data.total })); })
      .catch(() => {});
  }, [items]);

  const handleApprove = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/images/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已通过');
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'approved' as const } : i));
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectingId === null) return;
    try {
      const res = await apiFetch(`/api/admin/images/${rejectingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拒绝（关联内容已下架）');
        setItems(prev => prev.map(i => i.id === rejectingId ? { ...i, status: 'rejected' as const, reviewComment: rejectReason.trim() } : i));
        setRejectingId(null);
        setRejectReason('');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const contextLabel: Record<string, string> = {
    goods: '商品', posts: '帖子', lostfound: '失物招领', chat: '聊天', profile: '头像',
  };

  const filterTabs: { key: FilterType; label: string; count?: number }[] = [
    { key: 'pending', label: '待审核', count: counts.pending },
    { key: 'approved', label: '已通过' },
    { key: 'rejected', label: '已拒绝' },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">图片审核</h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => { setFilter(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === t.key
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-white dark:bg-[var(--color-card)] text-gray-500 dark:text-[var(--color-text-secondary)] border'
            }`}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filter === t.key ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton.List rows={4} />
      ) : items.length === 0 ? (
        <EmptyState message="暂无待审核图片" description="所有图片已审核完毕" icon={<FiImage className="text-4xl text-gray-300" />} />
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence>
              {items.map(item => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
                  className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 flex gap-4">
                  {/* Blurred preview */}
                  <div className="flex-shrink-0 flex gap-2">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative group">
                      <img src={item.blurredUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/50 text-white text-center py-0.5">模糊</span>
                    </div>
                    <button onClick={() => setPreviewUrl(item.url)}
                      className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative group cursor-pointer">
                      <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                        <FiZoomIn className="text-white opacity-0 group-hover:opacity-100 text-lg" />
                      </span>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                        {contextLabel[item.context] || item.context}
                      </span>
                      {item.uploader && (
                        <span className="text-xs text-gray-400">{item.uploader.nickname}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{formatTime(item.createdAt)}</p>

                    {item.status === 'rejected' && item.reviewComment && (
                      <p className="text-xs text-red-500 mt-1">原因：{item.reviewComment}</p>
                    )}
                    {item.status === 'approved' && (
                      <p className="text-xs text-green-500 mt-1">✓ 已通过</p>
                    )}
                  </div>

                  {/* Actions */}
                  {item.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(item.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors active:scale-95">
                        <FiCheck /> 通过
                      </button>
                      <button onClick={() => { setRejectingId(item.id); setRejectReason(''); }}
                        className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors active:scale-95">
                        <FiX /> 拒绝
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-[var(--color-card)] border disabled:opacity-30">上一页</button>
              <span className="text-sm text-gray-400">{page} / {totalPages}（共 {total} 张）</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-[var(--color-card)] border disabled:opacity-30">下一页</button>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectingId !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectingId(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-3">拒绝原因</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="请填写拒绝原因（将通知上传者，关联内容会被下架）"
                rows={3} maxLength={200}
                className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none" autoFocus />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setRejectingId(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium">取消</button>
                <button onClick={handleReject} disabled={!rejectReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-40">确认拒绝</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewUrl(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <img src={previewUrl} alt="原图预览" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
