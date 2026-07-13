import { useState, useEffect } from 'react';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { FiTrendingUp, FiClock, FiCompass } from 'react-icons/fi';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import toast from 'react-hot-toast';
import { EndOfList } from '@/components/common/EndOfList';
import { Header } from '@/components/layout/Header';
import { apiFetch } from '@/utils/api';
import { formatCount } from '@/utils/format';

interface FeedItem {
  id: number;
  type: 'note' | 'video' | 'treehole' | 'resource' | 'wanted' | 'goods' | 'qa' | 'post';
  title: string;
  content?: string;
  coverUrl?: string;
  images?: string[];
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  downloadCount?: number;
  price?: number;
  user?: { nickname: string; avatarUrl: string };
  code?: string;
  createdAt: string;
}

const TABS = [
  { key: 'recommend', label: '推荐', icon: FiCompass },
  { key: 'newest', label: '最新', icon: FiClock },
  { key: 'hot', label: '热门', icon: FiTrendingUp },
] as const;

const QUICK_LINKS = [
  { label: '笔记', emoji: '📝', path: '/explore', color: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { label: '树洞', emoji: '🌳', path: '/treehole', color: 'bg-amber-50 dark:bg-amber-500/10' },
  { label: '话题', emoji: '#️', path: '/tags', color: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: '资料', emoji: '📚', path: '/resources', color: 'bg-cyan-50 dark:bg-cyan-500/10' },
  { label: '求购', emoji: '🔍', path: '/wanted', color: 'bg-orange-50 dark:bg-orange-500/10' },
];

function FeedCard({ item, onClick }: { item: FeedItem; onClick: () => void }) {
  const isTreehole = item.type === 'treehole';
  const isVideo = item.type === 'video';
  const isResource = item.type === 'resource';
  const isWanted = item.type === 'wanted';
  const isGoods = item.type === 'goods';
  const isQa = item.type === 'qa';
  const hasCover = !!(item.coverUrl || item.images?.length);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.type === 'treehole' ? '树洞' : item.type === 'video' ? '视频' : item.type === 'resource' ? '资料' : item.type === 'wanted' ? '求购' : item.type === 'goods' ? '商品' : item.type === 'qa' ? '问答' : '笔记'}：${item.title || item.content?.slice(0, 30) || '查看详情'}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="break-inside-avoid mb-3 rounded-xl overflow-hidden bg-white dark:bg-[var(--color-card)]
        border border-gray-100 dark:border-[var(--color-border)] cursor-pointer
        shadow-sm hover:shadow-md active:scale-[0.985] transition-all duration-200"
    >
      {/* --- Treehole card (special style: amber gradient, no image) --- */}
      {isTreehole ? (
        <div className="bg-gradient-to-br from-amber-50 via-amber-100/60 to-yellow-50 
          dark:from-amber-900/30 dark:via-amber-800/20 dark:to-yellow-900/20
          p-4 min-h-[80px] flex flex-col">
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mb-2">
            🌳 匿名者#{item.code?.slice(0, 4) || '****'}
          </span>
          <p className="text-[13px] text-amber-900 dark:text-amber-100 leading-relaxed line-clamp-4">
            {item.content}
          </p>
          <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-amber-600 dark:text-amber-400">
            {item.likeCount != null && <span>❤️ {formatCount(item.likeCount)}</span>}
            {item.commentCount != null && <span>💬 {formatCount(item.commentCount)}</span>}
          </div>
        </div>
      ) : (
        <>
          {/* --- Cover Image --- */}
          <div className="relative bg-gray-100 dark:bg-gray-800 overflow-hidden"
            style={{ aspectRatio: isVideo ? '9/16' : isResource ? '4/3' : isWanted ? '1/1' : '3/4' }}>
            {hasCover ? (
              <>
                <img
                  src={item.coverUrl || item.images?.[0]}
                  alt=""
                  loading="lazy" decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                    <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white text-base leading-none ml-0.5">▶</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl opacity-40 dark:opacity-20">
                  {isVideo ? '🎬' : isResource ? '📄' : isWanted ? '🔍' : '📝'}
                </span>
              </div>
            )}

            {/* Content type badge */}
            <span className="absolute top-2 left-2 text-[10px] text-white bg-black/40 backdrop-blur-sm
              px-2 py-0.5 rounded-full">
              {isVideo ? '🎬 视频' : isResource ? '📄 资料' : isWanted ? '🔍 求购' : isGoods ? '💰 商品' : isQa ? '❓ 问答' : '📝 笔记'}
            </span>

            {/* Multi-image count */}
            {item.images && item.images.length > 1 && (
              <span className="absolute top-2 right-2 text-[10px] text-white bg-black/40 backdrop-blur-sm
                px-1.5 py-0.5 rounded-md">
                {item.images.length}图
              </span>
            )}
          </div>

          {/* --- Text Info --- */}
          <div className="p-3">
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-[var(--color-text-primary)]
              leading-snug line-clamp-2 mb-2">
              {item.title || item.content?.slice(0, 40)}
            </h3>
            {isGoods && item.price != null && (
              <span className="text-sm font-bold text-red-500 dark:text-red-400">¥{item.price.toLocaleString()}</span>
            )}
            {isGoods && <div className="mb-1" />}
            <div className="flex items-center justify-between">
              {/* Author */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                  {item.user?.avatarUrl && (
                    <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-[var(--color-text-tertiary)] truncate">
                  {item.user?.nickname || (item.code ? '匿名' : '用户')}
                </span>
              </div>
              {/* Stat */}
              <span className="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 ml-2">
                {item.type === 'goods' && item.price != null
                  ? `¥${item.price}`
                  : item.type === 'resource'
                    ? `⬇${formatCount(item.downloadCount || 0)}`
                    : `❤️${formatCount(item.likeCount || 0)}`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SquarePage() {
  const navigate = useAppNavigate();
  const [tab, setTab] = useState<string>('recommend');
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNav, setShowNav] = useState(true);

  // 画面↓(回上面)→显示，画面↑(看下面)→隐藏
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 60) {
          setShowNav(true);
        } else if (delta < -5) {
          setShowNav(true);    // 画面↓ 回上面
        } else if (delta > 5) {
          setShowNav(false);   // 画面↑ 看下面
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      apiFetch(`/api/goods${tab === 'hot' ? '/hot' : tab === 'newest' ? '/newest' : ''}?pageSize=12`).then(r => r.json()),
      apiFetch(`/api/notes?sort=${tab}&pageSize=12`).then(r => r.json()),
      apiFetch('/api/treehole?pageSize=8').then(r => r.json()),
      apiFetch('/api/lostfound?pageSize=6').then(r => r.json()),
      apiFetch('/api/qa?pageSize=4').then(r => r.json()),
      apiFetch('/api/wanted?pageSize=4').then(r => r.json()),
      apiFetch('/api/resources?pageSize=4').then(r => r.json()),
      apiFetch('/api/videos/feed?pageSize=4').then(r => r.json()),
    ]).then(results => {
      const mixed: FeedItem[] = [];
      let failedCount = 0;

      results.forEach(r => {
        if (r.status !== 'fulfilled') { failedCount++; return; }
        const json = r.value;
        if (json.code !== 200) { failedCount++; return; }
        (json.data?.list || (Array.isArray(json.data) ? json.data : [])).forEach((item: any) => {
          const images = typeof item.images === 'string'
            ? JSON.parse(item.images)
            : (item.images || []);

          let itemType: FeedItem['type'];
          // Detect type from data characteristics
          if (item.code) itemType = 'treehole';
          else if (item.postType === 'video' || item.videoUrl) itemType = 'video';
          else if (item.courseName || item.fileSize != null) itemType = 'resource';
          else if (item.budget != null || item.listType === 'buy') itemType = 'wanted';
          else if (item.listType != null || item.price != null) itemType = 'goods';
          else if (item.type === 'question' || item.type === 'share') itemType = 'qa';
          else if (item.answerCount != null || item.isResolved != null) itemType = 'qa';
          else itemType = 'note';

          mixed.push({
            id: item.id,
            type: itemType,
            title: item.title || item.courseName || '',
            content: item.content || item.description || '',
            coverUrl: item.videoCover || item.coverUrl || images[0] || '',
            images,
            likeCount: item.likeCount || 0,
            commentCount: item.commentCount || 0,
            viewCount: item.viewCount || 0,
            downloadCount: item.downloadCount || 0,
            price: item.price || undefined,
            user: item.user || item.author || null,
            code: item.code || null,
            createdAt: item.createdAt,
          });
        });
      });

      // Shuffle for organic feed appearance (deferred to avoid main thread jank)
      setTimeout(() => {
        mixed.sort(() => Math.random() - 0.5);
        setFeed([...mixed]);
      }, 0);

      if (failedCount > 0 && failedCount < 8) {
        toast.error(`${failedCount} 个内容源加载失败，部分内容可能缺失`);
      } else if (failedCount === 8) {
        toast.error('内容加载失败，请检查网络后重试');
      }
    }).catch(() => { toast.error('内容加载失败'); }).finally(() => setLoading(false));
  }, [tab]);

  const handleClick = (item: FeedItem) => {
    switch (item.type) {
      case 'video': navigate('/video'); break;
      case 'treehole': navigate('/treehole'); break;
      case 'resource': navigate(`/resources/${item.id}`); break;
      case 'wanted': navigate(`/wanted/${item.id}`); break;
      case 'goods': navigate(`/goods/${item.id}`); break;
      case 'qa': navigate(`/qa/${item.id}`); break;
      case 'post': navigate(`/square/post/${item.id}`); break;
      default: navigate(`/explore/note/${item.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20">
      {/* Header — 画面↑隐藏，画面↓显示（用opacity，不用transform） */}
      <div className={`sticky top-0 z-50 bg-white dark:bg-[var(--color-bg-section)]
        px-4 pt-2 pb-3 transition-all duration-300
        ${showNav ? 'opacity-100 border-b border-gray-100 dark:border-[var(--color-border)]' : 'opacity-0 pointer-events-none border-b-0'}`}>
        {/* Quick Links */}
        <div className="grid grid-cols-5 gap-1 mb-3">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              className="flex flex-col items-center gap-1 py-2 rounded-lg
                hover:bg-gray-50 dark:hover:bg-[var(--color-bg-hover)]
                active:scale-95 transition-all duration-150"
            >
              <div className={`w-10 h-10 rounded-xl ${link.color}
                flex items-center justify-center text-lg
                transition-transform duration-200 group-hover:scale-110`}>
                {link.emoji}
              </div>
              <span className="text-[10px] text-gray-500 dark:text-[var(--color-text-tertiary)]">
                {link.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[13px] font-medium
                transition-all duration-200 ${
                  tab === key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                    : 'text-gray-500 dark:text-[var(--color-text-tertiary)] hover:bg-gray-100 dark:hover:bg-[var(--color-bg-hover)]'
                }`}
            >
              <Icon className="text-[11px]" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-0 px-2 pt-3">
        {loading ? (
          /* Skeleton loading grid */
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-3">
                <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--color-card)]
                  border border-gray-100 dark:border-[var(--color-border)]">
                  <div className="skeleton rounded-none"
                    style={{
                      aspectRatio: '3/4',
                    }} />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-3 w-11/12 rounded-md" />
                    <div className="skeleton h-3 w-2/3 rounded-md" />
                    <div className="flex items-center justify-between pt-1">
                      <div className="skeleton h-4 w-16 rounded-md" />
                      <div className="skeleton h-3 w-10 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          /* Empty state */
          <EmptyState
            message="还没有内容"
            description="快来发布第一条动态吧"
            icon={<span className="text-5xl">📝</span>}
          />
        ) : (
          /* Feed — CSS Columns Waterfall */
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {feed.map((item, idx) => (
              <FeedCard
                key={`${item.type}-${item.id}-${idx}`}
                item={item}
                onClick={() => handleClick(item)}
              />
            ))}
          </div>
        )}

        {/* Bottom hint when scrolled to end */}
        {!loading && feed.length > 0 && (
          <EndOfList />
        )}
      </div>
    </div>
  );
}
