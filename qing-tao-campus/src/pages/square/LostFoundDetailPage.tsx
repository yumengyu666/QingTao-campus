import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { CampusTag } from '@/components/common/CampusTag';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { ShareButton } from '@/components/common/ShareButton';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { FiSend, FiFlag, FiCopy, FiCheck, FiMessageCircle, FiCheckCircle, FiTrash2, FiEye, FiClock, FiEdit2 } from 'react-icons/fi';
import { formatDate, formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

/**
 * 失物招领详情页 — 使用的接口：
 * GET    /api/lostfound/:id
 * GET    /api/lostfound/:id/comments
 * POST   /api/lostfound/:id/comments  { content }
 * DELETE /api/lostfound/:id/comments/:cid
 * PATCH  /api/lostfound/:id/resolve
 * DELETE /api/lostfound/:id
 * POST   /api/reports  { targetType:"lostfound", targetId, reason }
 */

export default function LostFoundDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [item, setItem] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/lostfound/${id}`).then(r => r.json()),
      apiFetch(`/api/lostfound/${id}/comments`).then(r => r.json()),
    ])
      .then(([itemJson, commentsJson]) => {
        if (itemJson.code === 200) setItem(itemJson.data);
        if (commentsJson.code === 200) setComments(commentsJson.data.list || []);
      })
      .catch(() => { toast.error('加载失败'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendComment = async () => {
    if (!commentText.trim()) { toast.error('请输入内容'); return; }
    try {
      const res = await apiFetch(`/api/lostfound/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
        setComments(prev => [...prev, { ...json.data, user: currentUser }]);
        setCommentText('');
        toast.success('评论成功');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const res = await apiFetch(`/api/lostfound/${id}/comments/${commentId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast.success('已删除');
      }
    } catch { toast.error('网络错误'); }
  };

  const handleResolve = async () => {
    try {
      const res = await apiFetch(`/api/lostfound/${id}/resolve`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        setItem({ ...item, status: 'resolved' });
        toast.success('已标记为已解决');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除吗？')) return;
    try {
      const res = await apiFetch(`/api/lostfound/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) { toast.success('已删除'); navigate(-1); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleReport = async () => {
    const finalReason = reportReason === '其他' ? customReason.trim() : reportReason;
    if (!finalReason) { toast.error('请选择或填写举报原因'); return; }
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'lostfound', targetId: Number(id), reason: finalReason }),
      });
      const json = await res.json();
      if (json.code === 201) { toast.success('举报已提交，管理员处理后会通知你'); setShowReport(false); setReportReason(''); setCustomReason(''); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const copyText = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field); toast.success('已复制');
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return <div><Header title="失物详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!item) return <div><Header title="失物详情" /><p className="text-center text-gray-400 py-20">信息不存在或已删除</p></div>;

  const isOwner = currentUser?.id === item.userId;

  return (
    <div>
      <Header
        title="失物详情"
        rightAction={
          item ? (
            <ShareButton title={item.title} />
          ) : undefined
        }
      />

      {/* Main content */}
      <div className="bg-white dark:bg-[var(--color-card)] p-4 md:rounded-xl">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.type === 'lost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {item.type === 'lost' ? '🔴 物品丢失' : '🟢 物品捡到'}
          </span>
          <CampusTag campus={item.campus} />
          {item.reward && <span className="text-xs text-orange-500 font-medium">💰 {item.reward}</span>}
          {item.status === 'resolved' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✅ 已解决</span>
          )}
        </div>

        <h1 className="text-xl font-bold">{item.title}</h1>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/user/${item.user?.id}`)}>
            <UserAvatar src={item.user?.avatarUrl} nickname={item.user?.nickname} size="sm" />
            <span className="text-sm font-medium truncate">{item.user?.nickname}</span>
          </div>
          {!isOwner && (
            <button onClick={() => navigate(`/messages/${item.userId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all">
              <FiMessageCircle className="text-xs" /> 私信
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mt-2 mb-4 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1"><FiClock className="text-xs" /> {formatTime(item.createdAt)}</span>
          <span className="inline-flex items-center gap-1"><FiEye className="text-xs" /> {item.viewCount}</span>
          <button onClick={() => setShowReport(true)} className="flex items-center gap-1 hover:text-red-500 transition-colors"><FiFlag /> 举报</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] px-2 py-1 rounded-full">📍 {item.location}</span>
          <span className="text-xs bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] px-2 py-1 rounded-full">🕐 {item.lostTime}</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{item.description || '(无详细描述)'}</p>

        {item.images?.length > 0 && (
          <div className="mt-4 space-y-2">
            {item.images.map((img: string, i: number) => <img key={i} src={img} alt="" className="w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity" loading="lazy" onClick={() => setLightboxIndex(i)} />)}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="bg-white dark:bg-[var(--color-card)] mt-2 md:mt-3 p-4 md:rounded-xl">
        <h3 className="font-medium text-sm mb-2">联系方式</h3>
        {item.contactWechat ? (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500">微信：{item.contactWechat}</span>
            <button onClick={() => copyText(item.contactWechat, 'wechat')} className="flex items-center gap-1 text-xs text-indigo-500 px-2 py-0.5 rounded bg-indigo-50">
              {copied === 'wechat' ? <FiCheck /> : <FiCopy />} 复制
            </button>
          </div>
        ) : null}
        {item.contactQq ? (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500">QQ：{item.contactQq}</span>
            <button onClick={() => copyText(item.contactQq, 'qq')} className="flex items-center gap-1 text-xs text-indigo-500 px-2 py-0.5 rounded bg-indigo-50">
              {copied === 'qq' ? <FiCheck /> : <FiCopy />} 复制
            </button>
          </div>
        ) : null}
        {!item.contactWechat && !item.contactQq && <p className="text-sm text-gray-400">未留联系方式</p>}
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-[var(--color-card)] mt-2 md:mt-3 p-4 md:rounded-xl">
        <h3 className="font-medium text-sm text-gray-500 mb-3">回复（{comments.length}）</h3>
        {comments.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">暂无回复，来提供线索吧</p>
        ) : (
          <div className="space-y-3 mb-4">
            {comments.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <UserAvatar src={c.user?.avatarUrl} nickname={c.user?.nickname} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.user?.nickname}</span>
                    <span className="text-xs text-gray-400">{formatTime(c.createdAt)}</span>
                    {currentUser?.id === c.userId && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-500 ml-auto">删除</button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] mt-1">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owner actions */}
      {isOwner && (
        <div className="bg-white dark:bg-[var(--color-card)] mt-2 md:mt-3 p-4 md:rounded-xl space-y-2">
          <button onClick={() => navigate(`/publish/lostfound/${item.id}`)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 active:scale-[0.98] transition-all">
            <FiEdit2 /> 编辑
          </button>
          {item.status !== 'resolved' && (
            <button onClick={handleResolve} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 active:scale-[0.98] transition-all">
              <FiCheckCircle /> 标记为已解决
            </button>
          )}
          <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition-all">
            <FiTrash2 /> 删除
          </button>
        </div>
      )}

      {/* Comment input — fixed bottom on mobile */}
      <div className="md:hidden h-16" />
      <div className="fixed bottom-14 left-0 right-0 md:static bg-white dark:bg-[var(--color-card)] border-t md:border border-gray-200 dark:border-[var(--color-border)] md:rounded-xl px-4 py-3 md:mt-3 z-20">
        <div className="flex items-center gap-2">
          <input type="text" placeholder="提供线索或说点什么..." value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none" />
          <button onClick={handleSendComment} disabled={!commentText.trim()}
            className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40">
            <FiSend />
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReport(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3">举报</h3>
            <div className="space-y-2 mb-3">
              {['垃圾广告', '不实信息', '人身攻击', '色情低俗', '违法违规', '其他'].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${reportReason === r ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{r}</button>
              ))}
            </div>
            <textarea value={customReason} onChange={e => setCustomReason(e.target.value)}
              placeholder={reportReason === '其他' ? '请描述具体原因...' : '可补充详细描述（选填）'}
              rows={2} maxLength={200}
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowReport(false); setReportReason(''); setCustomReason(''); }} className="flex-1 py-2.5 rounded-xl border text-sm font-medium">取消</button>
              <button onClick={handleReport} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">提交举报</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <ImageLightbox
        images={item?.images || []}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
