import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import { DailyCheckin } from '@/components/checkin/DailyCheckin';
import { QuickEntries } from '@/components/home/QuickEntries';
import { SearchBar } from '@/components/common/SearchBar';
import { CAMPUS_MAP } from '@/utils/constants';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { EndOfList } from '@/components/common/EndOfList';
import { LazyImage } from '@/components/common/LazyImage';
import { GlassCard } from '@/components/ui/GlassCard';
import { apiFetch } from '@/utils/api';
import type { Goods } from '@/types/goods';
import { formatTime } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { FiBox, FiX, FiEye, FiMapPin, FiTag, FiStar } from 'react-icons/fi';

const FALLBACK_BANNERS = [
  { id: 1, src: '/banner1.webp', alt: '轻淘 — 郑轻校园二手交易' },
  { id: 2, src: '/banner2.webp', alt: '毕业季大甩卖' },
  { id: 3, src: '/banner3.webp', alt: '发布须知' },
  { id: 4, src: '/banner4.webp', alt: '科学校区 & 东风校区' },
  { id: 5, src: '/banner5.webp', alt: '安全交易提醒' },
];

const listTypeOptions = [
  { value: 'sale', label: '出售', activeClass: 'bg-emerald-500 text-white shadow-emerald-500/25' },
  { value: 'buy', label: '求购', activeClass: 'bg-red-500 text-white shadow-red-500/25' },
  { value: 'rent', label: '出租', activeClass: 'bg-blue-500 text-white shadow-blue-500/25' },
  { value: 'rent_want', label: '求租', activeClass: 'bg-orange-500 text-white shadow-orange-500/25' },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function HomePage() {
  const navigate = useNavigate();
  const lgNav = useAppNavigate(); // 液态玻璃版本：自动处理 /lg 前缀
  const currentUser = useAuthStore((s) => s.user);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeCampus, setActiveCampus] = useState('');
  const [activeType, setActiveType] = useState('');
  const [newestGoods, setNewestGoods] = useState<Goods[]>([]);
  const [hotGoods, setHotGoods] = useState<Goods[]>([]);
  const [recommendedGoods, setRecommendedGoods] = useState<Goods[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [announcements, setAnnouncements] = useState<Array<{ id: number; title: string; content: string; createdAt: string }>>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; icon: string }[]>([]);
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<{ id: number; title: string; content: string; createdAt: string } | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => localStorage.getItem('welcome_dismissed') === '1');

  const fetchData = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory) params.set('categoryId', String(activeCategory));
    if (activeCampus) params.set('campus', activeCampus);
    if (activeType) params.set('listType', activeType);

    Promise.allSettled([
      apiFetch(`/api/goods/newest?${params.toString()}`, { signal: controller.signal }).then((r) => r.json()),
      apiFetch(`/api/goods/hot?${params.toString()}`, { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([newest, hot]) => {
        if (newest.code === 200) setNewestGoods(newest.data.list || []);
        if (hot.code === 200) {
          const newestIds = new Set((newest.data.list || []).map((g: Goods) => g.id));
          const dedupedHot = (hot.data.list || []).filter((g: Goods) => !newestIds.has(g.id));
          setHotGoods(dedupedHot);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {/* ignore */}
      })
      .finally(() => {
        setLoading(false);
        setInitialLoad(false);
      });
    return controller;
  }, [activeCategory, activeCampus, activeType]);

  useEffect(() => {
    const ctrl = fetchData();
    return () => ctrl.abort();
  }, [fetchData]);

  useEffect(() => {
    apiFetch('/api/categories')
      .then((r) => r.json())
      .then((j) => { if (j.code === 200) setCategories(j.data || []); })
      .catch(() => { /* 分类加载失败：非关键功能，静默降级 */ });
    apiFetch('/api/notifications/announcements')
      .then((r) => r.json())
      .then((j) => { if (j.code === 200) setAnnouncements(j.data || []); })
      .catch(() => { /* 公告加载失败：非关键功能，静默降级 */ });
    apiFetch('/api/banners')
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 200 && j.data?.length > 0) {
          setBanners(
            j.data.map((b: Record<string, unknown>) => ({
              id: b.id,
              src: b.imageUrl,
              alt: b.linkUrl ? `轮播图 ${b.id}` : `轻淘 — 轮播 ${b.id}`,
            })),
          );
        }
      })
      .catch(() => {});
    // "为你推荐" — 随机推荐（fallback to newest）
    apiFetch('/api/goods?sort=newest&pageSize=6')
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 200 && j.data?.list?.length > 0) {
          setRecommendedGoods(j.data.list);
        }
      })
      .catch(() => { /* 推荐加载失败：非关键功能，静默降级 */ });
  }, []);

  const handleCategoryClick = (catId: number) => {
    setActiveCategory((prev) => (prev === catId ? 0 : catId));
  };

  const handleCampusClick = (campus: string) => {
    setActiveCampus((prev) => (prev === campus ? '' : campus));
  };

  const activeFilters = useMemo(
    () =>
      [
        activeCategory && categories.find((c) => c.id === activeCategory)?.name,
        activeCampus && CAMPUS_MAP[activeCampus as keyof typeof CAMPUS_MAP],
        activeType && listTypeOptions.find((o) => o.value === activeType)?.label,
      ]
        .filter(Boolean)
        .join(' · '),
    [activeCategory, activeCampus, activeType, categories],
  );

  const goodsCount = newestGoods.length + hotGoods.length;

  const navigateToList = () => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('categoryId', String(activeCategory));
    if (activeCampus) params.set('campus', activeCampus);
    if (activeType) params.set('listType', activeType);
    lgNav(`/goods${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="pb-4">
      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2 md:pt-0">
        <SearchBar placeholder="搜索商品..." searchType="goods" />
      </div>

      {/* Welcome Card — shown to logged-in users who haven't dismissed it */}
      {currentUser && !welcomeDismissed && (
        <div className="px-4 mb-4">
          <GlassCard padding="lg" variant="featured" className="relative">
            <button
              onClick={() => {
                setWelcomeDismissed(true);
                localStorage.setItem('welcome_dismissed', '1');
              }}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="关闭"
            >
              <FiX size={16} />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20">
                🎉
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                  欢迎来到轻淘校园！
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  这里是郑州轻工业大学的校园社区 — 二手交易、社区广场、失物招领、匿名树洞，开启你的校园生活
                </p>
                <button
                  onClick={() => {
                    setWelcomeDismissed(true);
                    localStorage.setItem('welcome_dismissed', '1');
                  }}
                  className="mt-3 px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
                >
                  开始探索
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Welcome Hero — new users see this */}
      {!currentUser && (
        <div className="px-4 mb-4">
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
            <h2 className="text-xl font-bold mb-1">欢迎来到轻淘 🎓</h2>
            <p className="text-indigo-100 text-sm mb-4">郑州轻工业大学校园二手交易平台</p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/login')} className="btn bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all">
                立即登录
              </button>
              <button onClick={() => navigate('/register')} className="btn bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg px-4 py-2 text-sm font-medium transition-all">
                注册账号
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Entries */}
      <QuickEntries />

      {/* Daily Checkin */}
      <DailyCheckin />

      {/* Banner */}
      <div className="px-4 mb-6 md:px-0 md:mb-8">
        <Swiper modules={[Autoplay, Pagination]}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          pagination={{ clickable: true, el: '.banner-pagination' }}
          loop
          grabCursor
          className="banner-swiper shadow-lg"
        >
          {banners.map((b) => (
            <SwiperSlide key={b.id}>
              <img src={b.src} alt={b.alt} className="w-full h-full object-cover" loading={b.id === 1 ? 'eager' : 'lazy'} decoding="async" fetchPriority={b.id === 1 ? 'high' : 'auto'} />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="banner-pagination flex justify-center gap-1.5 mt-2" />
      </div>

      {/* Category Grid — 展示前 8 个 */}
      <div className="px-4 mb-4">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3"
        >
          {categories.slice(0, 8).map((cat, i) => (
            <motion.button
              key={cat.id}
              variants={itemFade}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex flex-col items-center gap-1.5 py-3 md:py-4 rounded-xl transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-105'
                  : 'bg-white dark:bg-[var(--color-card)] text-gray-600 dark:text-[var(--color-text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] hover:shadow-sm border border-gray-50 dark:border-[var(--color-border)]'
              }`}
            >
              <span className="text-2xl md:text-3xl">{cat.icon}</span>
              <span className="text-xs md:text-sm font-medium">{cat.name}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Announcements */}
      <AnimatePresence>
        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-4 mb-4"
          >
            <div className="bg-amber-50/80 dark:bg-amber-500/5 border border-amber-200/80 dark:border-amber-500/10 rounded-xl px-4 py-2.5 overflow-hidden">
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200/80 overflow-hidden">
                <span className="text-amber-500 text-xs flex-shrink-0">📢</span>
                <div className="overflow-hidden whitespace-nowrap">
                  <span className="inline-block animate-marquee">
                    {announcements.map((a, i: number) => (
                      <span
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`公告：${a.title}`}
                        onClick={() => setSelectedAnnouncement(a)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAnnouncement(a); } }}
                        className="cursor-pointer hover:underline font-medium"
                      >
                        {a.title}
                        {a.content ? ` — ${a.content.slice(0, 40)}` : ''}
                        {i < announcements.length - 1 ? '　|　' : ''}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="px-4 mb-5 flex flex-wrap items-center gap-2">
        {/* Campus filter */}
        {[
          { value: '', label: '全部校区' },
          ...Object.entries(CAMPUS_MAP).map(([value, label]) => ({ value, label })),
        ].map(({ value, label }) => (
          <motion.button
            key={value}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleCampusClick(value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              (value === '' && !activeCampus) || activeCampus === value
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-[var(--color-card)] text-gray-500 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)] hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
          >
            {label}
          </motion.button>
        ))}

        <span className="text-gray-300 dark:text-gray-600 mx-0.5 select-none">|</span>

        {/* Type filter */}
        {listTypeOptions.map(({ value, label, activeClass }) => {
          const isActive = activeType === value;
          return (
            <motion.button
              key={value}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveType(isActive ? '' : value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? `${activeClass} shadow-md`
                  : 'bg-white dark:bg-[var(--color-card)] text-gray-500 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)] hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              {label}
            </motion.button>
          );
        })}

        {activeFilters && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs text-gray-400 ml-1 inline"
          >
            {activeFilters}（{goodsCount} 件）
          </motion.span>
        )}
      </div>

      {/* Newest Goods */}
      <section className="px-4 mb-6" data-onboarding="home-goods">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg md:text-xl flex items-center gap-2">
            最新发布
            {activeFilters && (
              <span className="text-sm font-normal text-gray-400 ml-1 hidden sm:inline">
                · {activeFilters}
              </span>
            )}
          </h2>
          <button
            onClick={navigateToList}
            className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            查看全部 →
          </button>
        </div>

        {loading ? (
          <Skeleton.Grid count={4} cols={4} />
        ) : newestGoods.length === 0 ? (
          <EmptyState
            message="该分类暂无商品"
            description="试试切换其他分类或校区"
            icon={<FiBox className="text-3xl" />}
          />
        ) : (
          <>
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:hidden">
              {newestGoods.slice(0, 6).map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex-shrink-0 w-40"
                >
                  <GoodsItem g={g} onClick={() => lgNav(`/goods/${g.id}`)} />
                </motion.div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-4">
              {newestGoods.slice(0, 4).map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <GoodsItem g={g} onClick={() => lgNav(`/goods/${g.id}`)} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Hot Goods */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg md:text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-1"></span>🔥 热门推荐</h2>
        </div>

        {loading ? (
          <Skeleton.Grid count={4} cols={2} />
        ) : hotGoods.length === 0 ? (
          !loading && (
            <EmptyState
              message="该分类暂无热门商品"
              icon={<FiBox className="text-3xl" />}
            />
          )
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {hotGoods.slice(0, 8).map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <GoodsItem g={g} onClick={() => lgNav(`/goods/${g.id}`)} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended For You */}
      {recommendedGoods.length > 0 && (
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg md:text-xl flex items-center gap-2">
              <FiStar className="text-indigo-500" /> 为你推荐
            </h2>
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:hidden">
            {recommendedGoods.slice(0, 6).map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex-shrink-0 w-40"
              >
                <GoodsItem g={g} onClick={() => lgNav(`/goods/${g.id}`)} />
              </motion.div>
            ))}
          </div>
          {/* Desktop: grid */}
          <div className="hidden md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-4">
            {recommendedGoods.slice(0, 4).map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <GoodsItem g={g} onClick={() => lgNav(`/goods/${g.id}`)} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom hint */}
      {!loading && !initialLoad && (newestGoods.length > 0 || hotGoods.length > 0) && (
        <EndOfList />
      )}

      {/* Announcement Detail Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedAnnouncement(null)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSelectedAnnouncement(null); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[70vh] overflow-y-auto p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📢</span>
                  <h2 id="announcement-title" className="font-bold text-lg">{selectedAnnouncement.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  aria-label="关闭公告"
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <FiX />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content || '暂无详细内容'}
              </p>
              {selectedAnnouncement.createdAt && (
                <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 dark:border-[var(--color-border)]">
                  发布于 {formatTime(selectedAnnouncement.createdAt)}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ==================== Goods Item Card ==================== */
const GoodsItem = memo(function GoodsItem({ g, onClick }: { g: Goods; onClick: () => void }) {
  const isOwner = g.userId === useAuthStore.getState().user?.id;

  const getImgSrc = (img: string | { url?: string; blurredUrl?: string; pending?: boolean }) => {
    if (typeof img === 'string') return img;
    return isOwner ? img.url : img.pending ? img.blurredUrl : img.url;
  };

  const firstImg = g.images?.[0];

  const priceLabel =
    g.listType === 'rent' || g.listType === 'rent_want'
      ? `¥${g.price}/天`
      : g.listType === 'buy'
        ? `求 ¥${g.price}`
        : `¥${g.price}`;

  const typeTag = (() => {
    switch (g.listType) {
      case 'sale': return { label: '出', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' };
      case 'rent': return { label: '租', color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' };
      case 'buy': return { label: '求', color: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' };
      default: return { label: '求租', color: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' };
    }
  })();

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`${g.title}，价格${priceLabel}，${g.campus ? CAMPUS_MAP[g.campus as keyof typeof CAMPUS_MAP] || g.campus : ''}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      whileTap={{ scale: 0.97 }}
      className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden cursor-pointer hover-lift group border border-gray-50 dark:border-[var(--color-border)]"
    >
      {/* Image */}
      <div className="relative h-28 md:h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 flex items-center justify-center text-3xl md:text-4xl overflow-hidden">
        {firstImg ? (
          <LazyImage
            src={getImgSrc(firstImg)}
            alt=""
            className="w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <span className="opacity-40">📦</span>
        )}

        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${typeTag.color}`}>
          {typeTag.label}
        </span>

        {/* Sold badge */}
        {g.status === 'sold' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-bold px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
              已售出
            </span>
          </div>
        )}

        {/* Image review badge */}
        {g.hasPendingImages && g.status !== 'sold' && (
          <span className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-yellow-50/90 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400 backdrop-blur-sm">
            🕐 图片审核中
          </span>
        )}

        {/* Campus badge */}
        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-black/30 text-white backdrop-blur-sm">
          <FiMapPin className="inline mr-0.5" size={9} />
          {CAMPUS_MAP[g.campus as keyof typeof CAMPUS_MAP] || g.campus}
        </span>
      </div>

      {/* Content */}
      <div className="p-2.5 md:p-3">
        {/* Category */}
        {g.categoryName && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 inline-flex items-center gap-1 mb-1.5">
            {g.categoryIcon && <span>{g.categoryIcon}</span>}
            {g.categoryName}
          </span>
        )}

        {/* Title */}
        <p className="text-sm font-medium line-clamp-2 text-gray-800 dark:text-gray-100 min-h-[2.5rem] leading-snug">
          {g.title}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <FiEye className="text-[10px]" /> {g.viewCount || 0}
          </span>
          {g.condition && (
            <span className="px-1 py-0.5 rounded bg-gray-50 dark:bg-white/5">
              {g.condition === 'brand_new'
                ? '全新'
                : g.condition === 'like_new'
                  ? '几乎全新'
                  : g.condition === 'used'
                    ? '正常使用'
                    : '有磨损'}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-1.5">
          <span className="text-red-500 font-bold text-sm md:text-base">{priceLabel}</span>
        </div>
      </div>
    </motion.div>
  );
});
