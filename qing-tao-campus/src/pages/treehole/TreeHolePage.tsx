import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Pagination } from '@/components/common/Pagination';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiHeart, FiMessageCircle, FiSend, FiHash, FiFlag } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const LIKES_STORAGE_KEY = 'treehole_likes';
const MYCODES_STORAGE_KEY = 'treehole_mycodes';

function getLikedPosts(): Set<number> {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function getMyCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(MYCODES_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveLikedPosts(set: Set<number>) {
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...set]));
}

export default function TreeHolePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(getLikedPosts);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sort, setSort] = useState<'newest' | 'hot'>('newest');
  const [showMine, setShowMine] = useState(false);
  const [myCodes, setMyCodes] = useState<Set<string>>(getMyCodes);

  const fetchPosts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/treehole?page=${p}&pageSize=20&sort=${sort}`);
      const json = await res.json();
      if (json.code === 200) {
        setPosts(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [sort]);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch('/api/treehole', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      });
      const json = await res.json();
      if (json.code === 201) {
        toast.success('发布成功');
        // 记住匿名码，方便查找自己的帖子
        const newCode = json.data.code;
        if (newCode) {
          const updated = new Set(myCodes);
          updated.add(newCode);
          setMyCodes(updated);
          localStorage.setItem(MYCODES_STORAGE_KEY, JSON.stringify([...updated]));
        }
        setContent('');
        fetchPosts(1);
      } else {
        toast.error(json.message);
      }
    } catch { toast.error('网络错误'); }
    setPosting(false);
  };

  const handleLike = async (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    const isLiked = likedIds.has(postId);
    const action = isLiked ? 'unlike' : 'like';

    // Optimistic update
    const next = new Set(likedIds);
    if (isLiked) next.delete(postId); else next.add(postId);
    setLikedIds(next);
    saveLikedPosts(next);

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, likeCount: p.likeCount + (isLiked ? -1 : 1) };
      }
      return p;
    }));

    try {
      await apiFetch(`/api/treehole/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    } catch {
      // Revert on error
      const revert = new Set(likedIds);
      if (isLiked) revert.add(postId); else revert.delete(postId);
      setLikedIds(revert);
      saveLikedPosts(revert);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, likeCount: p.likeCount + (isLiked ? 1 : -1) };
        }
        return p;
      }));
    }
  };

  const handleReport = async (e: React.MouseEvent, targetType: string, targetId: number, reason?: string) => {
    e.stopPropagation();
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, reason: reason || '违规内容' }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
        toast.success('举报已提交');
      } else {
        toast.error(json.message || '举报失败');
      }
    } catch { toast.error('网络错误'); }
  };

  const handleExpand = async (postId: number) => {
    if (expandedId === postId) { setExpandedId(null); return; }
    setExpandedId(postId);
    // Fetch detail with comments
    try {
      const res = await apiFetch(`/api/treehole/${postId}`);
      const json = await res.json();
      if (json.code === 200) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: json.data.comments } : p));
      }
    } catch {}
  };

  return (
    <div className="min-h-screen">
      <Header title="树洞" />

      <div className="px-4 pb-24 pt-2 max-w-2xl mx-auto">

        {/* Post Input */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg shadow-indigo-100/20 dark:shadow-none border border-gray-100 dark:border-[var(--color-border)]/50 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg flex-shrink-0 shadow">
              💬
            </div>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="说点什么..."
              maxLength={1000}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-300/30 disabled:opacity-40 transition-all flex-shrink-0"
            >
              {posting ? '...' : '发布'}
            </motion.button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-right">{content.length}/1000</p>
        </motion.div>

        {/* Sort toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
          <button onClick={() => { setSort('newest'); setPage(1); fetchPosts(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sort === 'newest' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>最新</button>
          <button onClick={() => { setSort('hot'); setPage(1); fetchPosts(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sort === 'hot' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>最热</button>
          </div>
          {myCodes.size > 0 && (
            <button onClick={() => setShowMine(!showMine)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${showMine ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600'}`}>
              {showMine ? '全部' : `我的(${myCodes.size})`}
            </button>
          )}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/80 dark:bg-[var(--color-card)]/80 rounded-2xl p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3"><div className="h-6 w-16 bg-gray-200 dark:bg-[var(--color-card-hover)] rounded-full" /><div className="h-3 w-20 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded" /></div>
                <div className="space-y-2"><div className="h-4 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded w-full" /><div className="h-4 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded w-3/4" /></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FiHash className="text-5xl text-indigo-300 mb-4" />
            <p className="text-sm">树洞里空空的</p>
            <p className="text-xs mt-1">说出你的第一句话吧</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {posts.filter(p => !showMine || myCodes.has(p.code)).map((p, i) => {
                const isExpanded = expandedId === p.id;
                const isLiked = likedIds.has(p.id);

                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-[var(--color-border)]/50 overflow-hidden"
                  >
                    {/* Post body — clickable to expand */}
                    <div onClick={() => handleExpand(p.id)} className="p-4 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold rounded-full">
                          #{p.code}
                        </span>
                        <span className="text-[11px] text-gray-400">{formatTime(p.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{p.content}</p>

                      {/* Image grid if present */}
                      {(() => { const imgs = typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []); return imgs.length > 0 && (
                        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(imgs.length, 3)}, 1fr)` }}>
                          {imgs.slice(0, 3).map((img: string, idx: number) => (
                            <img key={idx} src={img} alt="" className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity" loading="lazy"
                              onClick={(e) => { e.stopPropagation(); setLightboxImages(imgs); setLightboxIndex(idx); }} />
                          ))}
                        </div>
                      ); })()}

                      {/* Actions bar */}
                      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-50 dark:border-[var(--color-border)]/50">
                        <button onClick={(e) => handleLike(e, p.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                            isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                          }`}>
                          <FiHeart className={isLiked ? 'fill-red-500' : ''} />
                          {p.likeCount || 0}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleExpand(p.id); }}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                            isExpanded ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-400'
                          }`}>
                          <FiMessageCircle />
                          {p.commentCount || 0}
                        </button>
                        <button onClick={(e) => handleReport(e, 'treehole_post', p.id)}
                          className="flex items-center gap-1 text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors ml-auto">
                          <FiFlag className="text-[11px]" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded comments */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                          className="border-t border-gray-100 dark:border-[var(--color-border)]/50">
                          <CommentsSection postId={p.id} comments={p.comments || []} onReport={(e, commentId) => handleReport(e, 'treehole_comment', commentId)} onCommentAdded={() => {
                            // Refresh comments
                            apiFetch(`/api/treehole/${p.id}`).then(r => r.json()).then(json => {
                              if (json.code === 200) {
                                setPosts(prev => prev.map(pp => pp.id === p.id ? { ...pp, comments: json.data.comments, commentCount: json.data.commentCount } : pp));
                              }
                            });
                          }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          total={total}
          onPageChange={(p) => { setPage(p); fetchPosts(p); }}
        />
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

function CommentsSection({ postId, comments, onCommentAdded, onReport }: { postId: number; comments: any[]; onCommentAdded: () => void; onReport: (e: React.MouseEvent, commentId: number) => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/treehole/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text.trim() }),
      });
      const json = await res.json();
      if (json.code === 201) {
        toast.success('评论成功');
        setText('');
        onCommentAdded();
      } else {
        toast.error(json.message);
      }
    } catch { toast.error('网络错误'); }
    setSending(false);
  };

  return (
    <div className="p-4 bg-gray-50/50 dark:bg-[var(--color-card)]/50">
      {/* Existing comments */}
      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2.5">
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 text-[10px] font-mono font-bold rounded-full h-fit mt-0.5">
                #{c.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-[var(--color-text)]">{c.content}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-[10px] text-gray-400">{formatTime(c.createdAt)}</p>
                  <button onClick={(e) => onReport(e, c.id)} className="text-[10px] text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
                    <FiFlag className="text-[10px]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">暂无评论，来说两句吧</p>
      )}

      {/* Comment input */}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="写评论..."
          maxLength={500}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all border border-gray-100 dark:border-[var(--color-border)]"
        />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
          onClick={handleSend} disabled={sending || !text.trim()}
          className="flex items-center gap-1 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium shadow disabled:opacity-40 transition-opacity">
          <FiSend className="text-xs" />
          {sending ? '...' : '发送'}
        </motion.button>
      </div>
    </div>
  );
}
