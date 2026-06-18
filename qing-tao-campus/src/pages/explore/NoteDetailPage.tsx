import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatCount, formatTime } from '@/utils/format';
import { FiHeart, FiMessageCircle, FiBookmark, FiShare2, FiMoreHorizontal, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  // 防抖状态：防止连续点击重复提交
  const [commenting, setCommenting] = useState(false);
  const likingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/notes/${id}`);
        const json = await res.json();
        if (json.code === 200) {
          setNote(json.data);
          // Check like status
          try {
            const lr = await apiFetch(`/api/notes/${id}/like/status`);
            const lj = await lr.json();
            if (lj.code === 200 && lj.data?.liked) setLiked(true);
          } catch {}
        }
      } catch {} finally { setLoading(false); }
    })();
    fetchComments();
  }, [id]);

  const fetchComments = async () => {
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`);
      const json = await res.json();
      if (json.code === 200) setComments(json.data?.list || []);
    } catch {}
  };

  const handleLike = async () => {
    if (!user) { toast.error('请先登录'); return; }
    // 防抖：请求进行中忽略后续点击
    if (likingRef.current) return;
    likingRef.current = true;
    setLiked(!liked);
    setNote((prev: any) => prev ? { ...prev, likeCount: prev.likeCount + (liked ? -1 : 1) } : prev);
    try { await apiFetch(`/api/notes/${id}/like`, { method: 'POST' }); }
    finally { likingRef.current = false; }
  };

  const handleSave = async () => {
    if (!user) { toast.error('请先登录'); return; }
    setSaved(!saved);
    try {
      if (saved) await apiFetch(`/api/notes/${id}/save`, { method: 'DELETE' });
      else await apiFetch(`/api/notes/${id}/save`, { method: 'POST' });
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    // 防抖：提交中禁用
    if (commenting) return;
    setCommenting(true);
    try {
      const res = await apiFetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
        setComments(prev => [json.data, ...prev]);
        setCommentText('');
        setNote((prev: any) => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev);
        toast.success('评论成功');
      }
    } catch { toast.error('评论失败'); }
    finally { setCommenting(false); }
  };

  if (loading) return <NoteSkeleton />;
  if (!note) return <div className="flex items-center justify-center h-96 text-gray-400">笔记不存在</div>;

  const images = typeof note.images === 'string' ? JSON.parse(note.images) : (note.images || []);

  return (
    <div className="min-h-screen bg-[var(--color-card)]">
      <MobileHeader title="笔记详情" onBack={() => navigate(-1)} />

      {/* Video player */}
      {note.videoUrl && (
        <div className="relative bg-black">
          <video
            src={note.videoUrl}
            controls
            playsInline
            poster={note.videoCover}
            className="w-full"
            style={{ maxHeight: '70vh' }}
          />
        </div>
      )}

      {/* Image slider */}
      <div className="relative bg-gray-100 dark:bg-gray-800">
        {images.length > 0 ? (
          <div className="relative" style={{ aspectRatio: '4/3' }} onTouchStart={(e) => {
            const startX = e.touches[0].clientX;
            const handler = (ev: TouchEvent) => {
              const dx = ev.changedTouches[0].clientX - startX;
              if (Math.abs(dx) > 50) {
                if (dx > 0 && currentImg > 0) setCurrentImg(c => c - 1);
                else if (dx < 0 && currentImg < images.length - 1) setCurrentImg(c => c + 1);
              }
              document.removeEventListener('touchend', handler);
            };
            document.addEventListener('touchend', handler);
          }}>
            <img src={images[currentImg]} alt="" className="w-full h-full object-cover" />
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_: any, i: number) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImg ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center text-6xl text-gray-300">📝</div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <UserAvatar src={note.user?.avatarUrl} nickname={note.user?.nickname} size="md" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">{note.user?.nickname}</div>
            <div className="text-xs text-gray-500">{formatTime(note.createdAt)}</div>
          </div>
          <button onClick={() => navigate(`/messages/${note.user?.id}`)}
            className="px-4 py-1.5 bg-[var(--color-explore-accent)] text-white text-sm rounded-full font-medium">+ 关注</button>
        </div>

        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{note.title}</h1>
        {note.content && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{note.content}</p>}
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {note.tags.map((t: any) => (
              <span key={t.id || t.name} className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">#{t.name}</span>
            ))}
          </div>
        )}
        {note.location && <div className="text-xs text-gray-400 mb-3">📍 {note.location}</div>}

        {/* Action bar */}
        <div className="flex items-center justify-between py-3 border-t border-b border-gray-100 dark:border-gray-800 mb-4">
          <button onClick={handleLike} className={`flex items-center gap-1 ${liked ? 'text-red-500' : 'text-gray-500'}`}>
            <FiHeart className={`text-xl ${liked ? 'fill-current' : ''}`} />
            <span className="text-sm">{formatCount(note.likeCount || 0)}</span>
          </button>
          <button className="flex items-center gap-1 text-gray-500">
            <FiMessageCircle className="text-xl" />
            <span className="text-sm">{formatCount(note.commentCount || 0)}</span>
          </button>
          <button onClick={handleSave} className={`flex items-center gap-1 ${saved ? 'text-yellow-500' : 'text-gray-500'}`}>
            <FiBookmark className={`text-xl ${saved ? 'fill-current' : ''}`} />
            <span className="text-sm">{formatCount(note.saveCount || 0)}</span>
          </button>
          <button onClick={() => { navigator.share?.({title: note.title, url: window.location.href}) || toast('已复制链接'); }} className="flex items-center gap-1 text-gray-500">
            <FiShare2 className="text-xl" /><span className="text-sm">分享</span>
          </button>
        </div>

        {/* Related */}
        {note.related?.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">相关推荐</div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {note.related.map((r: any) => {
                const rImgs = typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []);
                return (
                  <div key={r.id} onClick={() => navigate(`/explore/note/${r.id}`)} className="flex-shrink-0 w-32 cursor-pointer">
                    {rImgs[0] ? <img src={rImgs[0]} alt="" className="w-32 h-32 rounded-lg object-cover mb-1" />
                      : <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-1 flex items-center justify-center">📝</div>}
                    <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{r.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">评论 ({comments.length})</div>
          {comments.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-4">暂无评论</div>
          ) : comments.filter((c: any) => !c.replyToId).map((c: any) => (
            <div key={c.id} className="flex gap-2 mb-3">
              <UserAvatar src={c.user?.avatarUrl} nickname={c.user?.nickname} size="xs" />
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{c.user?.nickname}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{c.content}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{formatTime(c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment input */}
      <div className="sticky bottom-0 bg-[var(--color-card)] border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-3">
        <input value={commentText} onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
          placeholder="说点什么..."
          maxLength={300}
          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm outline-none text-gray-700 dark:text-gray-300" />
        <button onClick={handleComment} disabled={!commentText.trim() || commenting}
          className="text-[var(--color-explore-accent)] font-medium text-sm disabled:opacity-30">
          <FiSend className="text-lg" />
        </button>
      </div>
    </div>
  );
}

function NoteSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-card)]">
      <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}
