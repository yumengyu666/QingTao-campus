import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiMessageCircle, FiBookmark, FiShare2, FiMoreHorizontal } from 'react-icons/fi';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { EndOfList } from '@/components/common/EndOfList';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatCount, formatTime } from '@/utils/format';
import toast from 'react-hot-toast';

interface NoteCardData {
  id: number;
  title: string;
  content?: string;
  images: string[];
  postType: string; // note | video
  videoUrl?: string;
  videoCover?: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  coverIndex: number;
  tags?: { id: number; name: string }[];
  user: { id: number; nickname: string; avatarUrl: string };
  createdAt: string;
}

function NoteCard({ note, onClick }: { note: NoteCardData; onClick: () => void }) {
  const images = typeof note.images === 'string' ? JSON.parse(note.images) : (note.images || []);
  const coverUrl = note.videoCover || (images[note.coverIndex || 0] || images[0] || '');

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm break-inside-avoid mb-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Image / Video Cover */}
      <div className="relative bg-gray-100 dark:bg-gray-700 overflow-hidden" style={{
        aspectRatio: images.length > 1 ? '3/4' : '1/1',
      }}>
        {coverUrl ? (
          <img src={coverUrl} alt={note.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">📝</div>
        )}

        {/* Video badge */}
        {note.postType === 'video' && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
            <span>▶</span>
            <span>视频</span>
          </div>
        )}

        {/* Multi-image indicator */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-1.5 py-0.5 rounded">
            {images.length}张
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1.5 leading-relaxed">
          {note.title}
        </h3>

        {/* Bottom bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserAvatar src={note.user?.avatarUrl} nickname={note.user?.nickname} size="xs" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex-1">
              {note.user?.nickname || '用户'}
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-gray-400 shrink-0">
            <FiHeart className="text-[11px]" />
            <span className="text-[11px]">{formatCount(note.likeCount)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [notes, setNotes] = useState<NoteCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('recommend');
  const [selectedNote, setSelectedNote] = useState<NoteCardData | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const user = useAuthStore((s) => s.user);
  const loaderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { key: 'recommend', label: '推荐' },
    { key: 'newest', label: '最新' },
    { key: 'hot', label: '热门' },
  ];

  const fetchNotes = useCallback(async (pageNum: number, reset = false) => {
    try {
      setLoading(true);
      if (reset) setNotes([]);
      const res = await apiFetch(`/api/notes?sort=${activeTab}&postType=note&page=${pageNum}&pageSize=20`);
      const json = await res.json();
      if (json.code === 200) {
        const list = json.data.list || [];
        if (reset) {
          setNotes(list);
        } else {
          setNotes(prev => [...prev, ...list]);
        }
        setHasMore(list.length >= 20);
      }
    } catch (err) {
      // Silently handle - may use existing posts
    } finally {
      setLoading(false);
    }
  }, []);

  // Try to fetch notes, fallback to existing posts if API not ready
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/api/posts?pageSize=20');
        const json = await res.json();
        if (json.code === 200) {
          const list = (json.data.list || []).map((p: any) => ({
            ...p,
            postType: 'note',
            likeCount: p.likeCount || 0,
            commentCount: p.commentCount || 0,
            saveCount: 0,
            coverIndex: 0,
            images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
          }));
          setNotes(list);
          setHasMore(list.length >= 20);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  // Infinite scroll — load more when page changes
  useEffect(() => {
    if (page > 1) fetchNotes(page);
  }, [page, fetchNotes]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const handleLike = async (noteId: number) => {
    const isLiked = liked.has(noteId);
    setLiked(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(noteId); else next.add(noteId);
      return next;
    });
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, likeCount: n.likeCount + (isLiked ? -1 : 1) } : n
    ));
    try {
      await apiFetch(`/api/notes/${noteId}/like`, { method: 'POST' });
    } catch {}
  };

  const handleSave = async (noteId: number) => {
    try {
      await apiFetch(`/api/notes/${noteId}/save`, { method: 'POST' });
      toast.success('已收藏');
    } catch { toast('收藏功能开发中'); }
  };

  // Note detail modal
  const NoteDetail = selectedNote && (() => {
    const images = typeof selectedNote.images === 'string'
      ? JSON.parse(selectedNote.images) : (selectedNote.images || []);
    const [currentImg, setCurrentImg] = useState(0);

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[var(--color-card)] overflow-y-auto"
        >
          {/* Image slider */}
          <div className="relative bg-gray-100 dark:bg-gray-800">
            {images.length > 0 ? (
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={images[currentImg]}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === currentImg ? 'bg-white' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center text-6xl text-gray-300">
                📝
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => setSelectedNote(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar src={selectedNote.user?.avatarUrl} nickname={selectedNote.user?.nickname} size="md" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedNote.user?.nickname}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(selectedNote.createdAt)}
                </div>
              </div>
              <button className="px-4 py-1.5 bg-[var(--color-explore-accent)] text-white text-sm rounded-full font-medium">
                + 关注
              </button>
            </div>

            {/* Title & Content */}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {selectedNote.title}
            </h1>
            {selectedNote.content && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                {selectedNote.content}
              </p>
            )}

            {/* Tags */}
            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedNote.tags.map((tag: any) => (
                  <span key={tag.id || tag.name} className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between py-3 border-t border-b border-gray-100 dark:border-gray-800 mb-4">
              <button onClick={() => handleLike(selectedNote.id)}
                className={`flex items-center gap-1 ${liked.has(selectedNote.id) ? 'text-red-500' : 'text-gray-500'}`}>
                <FiHeart className={`text-xl ${liked.has(selectedNote.id) ? 'fill-current' : ''}`} />
                <span className="text-sm">{formatCount(selectedNote.likeCount)}</span>
              </button>
              <button className="flex items-center gap-1 text-gray-500">
                <FiMessageCircle className="text-xl" />
                <span className="text-sm">{formatCount(selectedNote.commentCount)}</span>
              </button>
              <button onClick={() => handleSave(selectedNote.id)}
                className="flex items-center gap-1 text-gray-500">
                <FiBookmark className="text-xl" />
                <span className="text-sm">{formatCount(selectedNote.saveCount || 0)}</span>
              </button>
              <button className="flex items-center gap-1 text-gray-500">
                <FiShare2 className="text-xl" />
                <span className="text-sm">分享</span>
              </button>
            </div>

            {/* Comments placeholder */}
            <div className="text-sm text-gray-400 text-center py-4">
              暂无评论，来发表第一条评论吧
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <MobileHeader title="发现" onBack={() => nav('/square')} />
      {/* Tab bar */}
      <div className="sticky top-12 z-sticky bg-[var(--color-card)] border-b border-gray-100 dark:border-gray-800">
        {/* Tab bar */}
        <div className="px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors font-medium ${
                  activeTab === tab.key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Masonry waterfall */}
      <div ref={containerRef} className="px-3 py-3 columns-2 gap-3">
        {notes.map((note: any) => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => nav(`/explore/note/${note.id}`)}
          />
        ))}

        {/* Loading skeleton */}
        {loading && (
          <div className="columns-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="break-inside-avoid mb-4">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                  <div className="aspect-[3/4]" />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="h-4" />

        {/* End of list */}
        {!hasMore && !loading && notes.length > 0 && <EndOfList />}
      </div>

      {/* Empty state */}
      {!loading && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-6xl mb-4">📝</span>
          <p className="text-base">还没有笔记</p>
          <p className="text-sm mt-1">发布社区的第一篇笔记吧</p>
        </div>
      )}

      {/* Note Detail */}
      {selectedNote && <NoteDetail />}
    </div>
  );
}
