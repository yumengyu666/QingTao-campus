import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { FiEye, FiFlag, FiSend, FiTrash2, FiEdit2, FiMessageCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { formatDate, formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const loadedRef = useRef(false);

  useEffect(() => {
    if (!id || loadedRef.current) return;
    loadedRef.current = true;
    // Load post
    apiFetch(`/api/posts/${id}`).then(r => r.json()).then(json => {
      if (json.code === 200) {
        setPost(json.data);
        // AI 审核轮询
        if (json.data.status === 'approved') {
          let n = 0; let cancelled = false;
          const poll = async () => { if (cancelled || n++ >= 4) return; await new Promise(r => setTimeout(r, 3000)); if (cancelled) return;
            try { const r = await apiFetch(`/api/posts/${id}`); const j = await r.json();
              if (j.code === 200 && j.data.status === 'offline') setPost({ ...j.data, _aiFlagged: true });
              else poll(); } catch { poll(); } };
          poll();
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
    // Load comments
    apiFetch(`/api/posts/${id}/comments`).then(r => r.json()).then(json => {
      if (json.code === 200) setComments(json.data.list || []);
    }).catch(() => {});
  }, [id]);

  const handleSend = async () => {
    if (!commentText.trim()) { toast.error('请输入评论内容'); return; }
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.code === 201) {
        toast.success('评论成功');
        setComments([json.data, ...comments]);
        setCommentText('');
      } else {
        toast.error(json.message || '评论失败');
      }
    } catch { toast.error('网络错误'); }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除该帖子吗？')) return;
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已删除');
        navigate(-1);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  if (loading) return <div><Header title="帖子详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!post) return <div><Header title="帖子详情" /><p className="text-center text-gray-400 py-12">帖子不存在</p></div>;

  const isOwner = currentUser?.id === post.userId;

  return (
    <div>
      <Header title="帖子详情" onShare={() => {
        const url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: post.title, url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(url).then(() => toast.success('链接已复制')).catch(() => {});
        }
      }} />

      <div className="bg-white dark:bg-[var(--color-card)] p-4 md:rounded-xl">
        <h1 className="text-xl font-bold">{post.title}</h1>
        {(post as any)._aiFlagged && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 font-medium">AI审核未通过，已下架</span>
        )}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/user/${post.user?.id}`)}>
            <UserAvatar src={post.user?.avatarUrl} nickname={post.user?.nickname} size="sm" />
            <span className="text-sm font-medium truncate">{post.user?.nickname}</span>
          </div>
          {!isOwner && (
            <button
              onClick={() => navigate(`/messages/${post.userId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95 transition-all flex-shrink-0"
            >
              <FiMessageCircle className="text-xs" />
              私信
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>{formatTime(post.createdAt)}</span>
          <span className="flex items-center gap-1"><FiEye /> {post.viewCount}</span>
          <button className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors" onClick={() => setShowReport(true)}>
            <FiFlag /> 举报
          </button>
        </div>
        {isOwner && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-[var(--color-border)]">
            <button onClick={() => navigate(`/publish/post/${post.id}`)}
              className="flex items-center gap-1 text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
              <FiEdit2 /> 编辑
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
              <FiTrash2 /> 删除
            </button>
          </div>
        )}
        <div className="mt-5 text-sm text-gray-700 dark:text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
        {(post.images || []).length > 0 && (
          <div className="mt-4 space-y-2">
            {post.images.map((img: string, i: number) => (
              <img key={i} src={img} alt="" className="w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity" onClick={() => setLightboxIndex(i)} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[var(--color-card)] mt-2 md:mt-3 p-4 md:rounded-xl">
        <h3 className="font-medium text-sm text-gray-500 mb-3">全部回复（{comments.length}）</h3>
        {comments.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">暂无回复，来说两句吧</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <UserAvatar src={c.user?.avatarUrl} nickname={c.user?.nickname} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.user?.nickname}</span>
                    <span className="text-xs text-gray-400">{formatTime(c.createdAt)}</span>
                    {c.status === 'pending' && <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-600">审核中</span>}
                    {c.status === 'rejected' && <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-500">已拒绝</span>}
                    {currentUser?.id === c.userId && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await apiFetch(`/api/posts/${id}/comments/${c.id}`, { method: 'DELETE' });
                            const json = await res.json();
                            if (json.code === 200) {
                              toast.success('已删除');
                              setComments(comments.filter(x => x.id !== c.id));
                            } else toast.error(json.message);
                          } catch { toast.error('网络错误'); }
                        }}
                        className="text-xs text-gray-400 hover:text-red-500 ml-auto"
                      >删除</button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                  {c.status === 'rejected' && c.reviewComment && (
                    <p className="text-xs text-red-400 mt-0.5">原因：{c.reviewComment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="md:hidden h-16" />
      <div className="fixed bottom-14 left-0 right-0 md:static bg-white dark:bg-[var(--color-card)] border-t md:border border-gray-200 dark:border-[var(--color-border)] md:rounded-xl px-4 py-3 md:mt-3 z-20">
        <div className="flex items-center gap-2">
          <input
            type="text" placeholder="说点什么..." value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none"
          />
          <button onClick={handleSend} disabled={!commentText.trim()}
            className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity">
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
            <h3 className="font-bold text-lg mb-3">举报帖子</h3>
            <div className="space-y-2 mb-3">
              {['垃圾广告','不实信息','人身攻击','色情低俗','违法违规','其他'].map(r => (
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
              <button onClick={async () => {
                const finalReason = reportReason === '其他' ? customReason.trim() : reportReason;
                if (!finalReason) { toast.error('请选择或填写原因'); return; }
                const res = await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ targetType: 'post', targetId: Number(id), reason: finalReason }) });
                const json = await res.json();
                if (json.code === 201) { toast.success('举报已提交'); setShowReport(false); setReportReason(''); setCustomReason(''); }
                else toast.error(json.message);
              }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">提交举报</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <ImageLightbox
        images={post?.images || []}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
