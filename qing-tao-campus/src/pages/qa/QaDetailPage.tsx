import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiThumbsUp, FiCheckCircle, FiSend, FiShare2, FiFlag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { ShareButton } from '@/components/common/ShareButton';

export default function QaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [post, setPost] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const { bottomOffset } = useVisualViewport();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{ url: string }[]>([]);

  useEffect(() => {
    if (!id || !token) return;
    setLoading(true);
    apiFetch(`/api/qa/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) {
          setPost(json.data.post);
          setAnswers(json.data.answers || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, token]);

  const submitAnswer = async () => {
    if (!answerText.trim()) { toast.error('请输入回答'); return; }
    try {
      const res = await apiFetch(`/api/qa/${id}/answers`, {
        method: 'POST',
        body: JSON.stringify({ content: answerText.trim() }),
      });
      const json = await res.json();
      if (json.code === 201) {
        setAnswers(prev => [json.data, ...prev]);
        setAnswerText('');
        toast.success('回答成功');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const toggleVote = async (answerId: number) => {
    try {
      const res = await apiFetch(`/api/qa/answers/${answerId}/vote`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, likeCount: a.likeCount + (json.message?.includes('取消') ? -1 : 1) } : a));
      }
    } catch { /* ignore */ }
  };

  const markBest = async (answerId: number) => {
    try {
      const res = await apiFetch(`/api/qa/answers/${answerId}/best`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, isBest: true } : { ...a, isBest: false }));
        setPost((p: any) => ({ ...p, isResolved: true, bestAnswerId: answerId }));
        toast.success('已采纳');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleReport = async () => {
    const finalReason = reportReason === '其他' ? customReason.trim() : reportReason;
    if (!finalReason) { toast.error('请选择或填写举报原因'); return; }
    try {
      const res = await apiFetch('/api/reports', { method: 'POST',
        body: JSON.stringify({ targetType: 'qapost', targetId: Number(id), reason: finalReason }) });
      const json = await res.json();
      if (json.code === 201) { toast.success('举报已提交，管理员处理后会通知你'); setShowReport(false); setReportReason(''); setCustomReason(''); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  if (loading) return <div><Header title="问题详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!post) return <div><Header title="问题详情" /><p className="text-center py-12 text-gray-400">问题不存在</p></div>;

  const isOwner = currentUser?.id === post.userId;

  return (
    <div>
      <Header
        title="问题详情"
        rightAction={
          post ? (
            <ShareButton title={post.title} />
          ) : undefined
        }
      />

      <div className="p-4 space-y-4 pb-24">
        {/* Question */}
        <div className="bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{post.type === 'question' ? '❓' : '💡'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.type === 'question' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {post.type === 'question' ? '求助' : '分享'}
            </span>
            {post.isResolved && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✅ 已解决</span>}
          </div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            {post.title}
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('链接已复制'); }}
              className="text-gray-300 hover:text-amber-500 transition-colors flex-shrink-0">
              <FiShare2 className="text-sm" />
            </button>
            <button onClick={() => setShowReport(true)}
              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 ml-1">
              <FiFlag className="text-sm" />
            </button>
          </h1>
          {post.content && <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] mt-2 leading-relaxed">{post.content}</p>}
          {post.images?.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {post.images.map((img: string, i: number) => (
                <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" loading="lazy"
                  onClick={() => { setLightboxImages(post.images.map((u: string) => ({ url: u }))); setLightboxIndex(i); setLightboxOpen(true); }} />
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span>{post.user?.nickname}</span>
            <span>{formatTime(post.createdAt)}</span>
            <span>👁 {post.viewCount}</span>
          </div>
        </div>

        {/* Answers */}
        <div>
          <h3 className="font-medium text-sm mb-3">{answers.length} 个回答</h3>
          {answers.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">暂无回答，来写第一个吧</p>
          ) : (
            <div className="space-y-3">
              {[...answers].sort((a, b) => (b.isBest ? 1 : 0) - (a.isBest ? 1 : 0) || b.likeCount - a.likeCount).map((a) => (
                <div key={a.id} className={`bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur rounded-2xl p-4 shadow-sm ${a.isBest ? 'ring-2 ring-green-400' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      {a.user?.nickname?.[0]}
                    </div>
                    <span className="text-sm font-medium">{a.user?.nickname}</span>
                    <span className="text-xs text-gray-400">{formatTime(a.createdAt)}</span>
                    {a.isBest && <FiCheckCircle className="text-green-500 ml-auto" />}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-[var(--color-text)] leading-relaxed">{a.content}</p>
                  {a.images?.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {a.images.map((img: string, i: number) => (
                        <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" loading="lazy"
                          onClick={() => { setLightboxImages(a.images.map((u: string) => ({ url: u }))); setLightboxIndex(i); setLightboxOpen(true); }} />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <button onClick={() => toggleVote(a.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-500 transition-colors">
                      <FiThumbsUp /> {a.likeCount}
                    </button>
                    {isOwner && !post.isResolved && (
                      <button onClick={() => markBest(a.id)}
                        className="text-xs text-green-500 hover:text-green-600 transition-colors ml-auto">
                        采纳为最佳答案
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Answer Input */}
      <div className="fixed left-0 right-0 bg-white/90 dark:bg-[var(--color-card)]/90 backdrop-blur border-t border-gray-200 dark:border-[var(--color-border)] px-4 py-3 z-20"
        style={{ bottom: `calc(3.5rem + ${bottomOffset}px)` }}>
        <div className="flex items-center gap-2">
          <input value={answerText} onChange={e => setAnswerText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitAnswer()}
            placeholder="写下你的回答..." maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none" />
          <button onClick={submitAnswer} disabled={!answerText.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center disabled:opacity-30">
            <FiSend className="text-sm" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-right mt-1">{answerText.length}/500</p>
        </div>

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowReport(false); setReportReason(''); setCustomReason(''); }}>
          <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">举报问题</h3>
            <div className="space-y-2 mb-3">
              {['垃圾广告', '不实信息', '人身攻击', '违规内容', '其他'].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${reportReason === r ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{r}</button>
              ))}
            </div>
            <textarea value={customReason} onChange={e => setCustomReason(e.target.value)}
              placeholder={reportReason === '其他' ? '请描述具体原因...' : '可补充详细描述（选填）'}
              rows={2} maxLength={200}
              className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowReport(false); setReportReason(''); setCustomReason(''); }} className="flex-1 py-2.5 rounded-xl border text-sm font-medium">取消</button>
              <button onClick={handleReport} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">提交举报</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
