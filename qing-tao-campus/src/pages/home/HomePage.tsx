import { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchBar } from '@/components/common/SearchBar';
import { CAMPUS_MAP } from '@/utils/constants';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { FiBox, FiX, FiEye } from 'react-icons/fi';

const FALLBACK_BANNERS = [
  { id: 1, src: '/banner1.webp', alt: '轻淘 — 郑轻校园二手交易' },
  { id: 2, src: '/banner2.webp', alt: '毕业季大甩卖' },
  { id: 3, src: '/banner3.webp', alt: '发布须知' },
  { id: 4, src: '/banner4.webp', alt: '科学校区 & 东风校区' },
  { id: 5, src: '/banner5.webp', alt: '安全交易提醒' },
];

const listTypeOptions = [
  { value: 'sale', label: '出售', activeClass: 'bg-green-500 text-white' },
  { value: 'buy', label: '求购', activeClass: 'bg-red-500 text-white' },
  { value: 'rent', label: '出租', activeClass: 'bg-emerald-500 text-white' },
  { value: 'rent_want', label: '求租', activeClass: 'bg-orange-500 text-white' },
] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeCampus, setActiveCampus] = useState('');
  const [activeType, setActiveType] = useState('');
  const [newestGoods, setNewestGoods] = useState<any[]>([]);
  const [hotGoods, setHotGoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; icon: string }[]>([]);
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  const fetchData = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory) params.set('categoryId', String(activeCategory));
    if (activeCampus) params.set('campus', activeCampus);
    if (activeType) params.set('listType', activeType);

    Promise.all([
      apiFetch(`/api/goods/newest?${params.toString()}`, { signal: controller.signal }).then((r) => r.json()),
      apiFetch(`/api/goods/hot?${params.toString()}`, { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([newest, hot]) => {
        if (newest.code === 200) setNewestGoods(newest.data.list || []);
        if (hot.code === 200) {
          // 去重：热门推荐中排除已在最新发布中出现的商品
          const newestIds = new Set((newest.data.list || []).map((g: any) => g.id));
          const dedupedHot = (hot.data.list || []).filter((g: any) => !newestIds.has(g.id));
          setHotGoods(dedupedHot);
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') {/* ignore */} })
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

  // 一次性加载：分类、公告、轮播图
  useEffect(() => {
    apiFetch('/api/categories')
      .then(r => r.json())
      .then(j => { if (j.code === 200) setCategories(j.data || []); })
      .catch(() => {});
    apiFetch('/api/notifications/announcements')
      .then(r => r.json())
      .then(j => { if (j.code === 200) setAnnouncements(j.data || []); })
      .catch(() => {});
    apiFetch('/api/banners')
      .then(r => r.json())
      .then(j => {
        if (j.code === 200 && j.data?.length > 0) {
          setBanners(j.data.map((b: any) => ({
            id: b.id,
            src: b.imageUrl,
            alt: b.linkUrl ? `轮播图 ${b.id}` : `轻淘 — 轮播 ${b.id}`,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const handleCategoryClick = (catId: number) => {
    setActiveCategory((prev) => (prev === catId ? 0 : catId));
  };

  const handleCampusClick = (campus: string) => {
    setActiveCampus((prev) => (prev === campus ? '' : campus));
  };

  const activeFilters = [
    activeCategory && categories.find((c) => c.id === activeCategory)?.name,
    activeCampus && CAMPUS_MAP[activeCampus as keyof typeof CAMPUS_MAP],
    activeType && listTypeOptions.find((o) => o.value === activeType)?.label,
  ]
    .filter(Boolean)
    .join(' · ');

  const goodsCount = newestGoods.length + hotGoods.length;

  const navigateToList = () => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('categoryId', String(activeCategory));
    if (activeCampus) params.set('campus', activeCampus);
    if (activeType) params.set('listType', activeType);
    navigate(`/goods${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="pb-4">
      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2 md:pt-0">
        <SearchBar placeholder="搜索商品..." searchType="goods" />
      </div>

      {/* Banner */}
      <div className="px-4 mb-6 md:px-0 md:-mx-6 md:mb-8">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          pagination={{ clickable: true, el: '.banner-pagination' }}
          loop
          grabCursor
          className="banner-swiper"
        >
          {banners.map((b) => (
            <SwiperSlide key={b.id}>
              <img src={b.src} alt={b.alt} className="w-full h-full object-cover" />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="banner-pagination flex justify-center gap-1.5 mt-2" />
      </div>

      {/* Category Grid — 仅展示前8个 */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
          {categories.slice(0, 8).map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleCategoryClick(cat.id)}
              whileTap={{ scale: 0.94 }}
              className={`flex flex-col items-center gap-1.5 py-3 md:py-4 rounded-xl transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-105'
                  : 'bg-white dark:bg-[var(--color-card)] text-gray-600 dark:text-[var(--color-text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)]'
              }`}
            >
              <span className="text-2xl md:text-3xl">{cat.icon}</span>
              <span className="text-xs md:text-sm font-medium">{cat.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 overflow-hidden">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200 overflow-hidden">
              <span className="text-amber-500 text-xs flex-shrink-0">📢</span>
              <div className="overflow-hidden whitespace-nowrap">
                <span className="inline-block animate-marquee">
                  {announcements.map((a: any, i: number) => (
                    <span key={a.id} onClick={() => setSelectedAnnouncement(a)} className="cursor-pointer hover:underline font-medium">
                      {a.title}{a.content ? ` — ${a.content.slice(0, 40)}` : ''}
                      {i < announcements.length - 1 ? '　|　' : ''}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 mb-4 flex flex-wrap items-center gap-2">
        {/* Campus */}
        {[
          { value: '', label: '全部校区' },
          { value: 'kexue', label: '科学校区' },
          { value: 'dongfeng', label: '东风校区' },
        ].map(({ value, label }) => (
          <motion.button
            key={value}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleCampusClick(value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              (value === '' && !activeCampus) || activeCampus === value
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-white dark:bg-[var(--color-card)] text-gray-500 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)] hover:border-indigo-300'
            }`}
          >
            {label}
          </motion.button>
        ))}

        <span className="text-gray-300 dark:text-gray-600 mx-0.5">|</span>

        {/* Type */}
        {listTypeOptions.map(({ value, label, activeClass }) => {
          const isActive = activeType === value;
          return (
            <motion.button
              key={value}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveType(isActive ? '' : value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? activeClass + ' shadow-md'
                  : 'bg-white dark:bg-[var(--color-card)] text-gray-500 dark:text-[var(--color-text-secondary)] border border-gray-200 dark:border-[var(--color-border)] hover:border-indigo-300'
              }`}
            >
              {label}
            </motion.button>
          );
        })}

        {activeFilters && (
          <span className="text-xs text-gray-400 ml-1 hidden md:inline">
            {activeFilters}（{goodsCount}件）
          </span>
        )}
      </div>

      {/* Newest Goods */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg md:text-xl">
            最新发布
            {activeFilters && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                · {activeFilters}
              </span>
            )}
          </h2>
          <button
            onClick={navigateToList}
            className="text-sm md:text-base text-indigo-500 hover:text-indigo-600 font-medium"
          >
            查看全部 →
          </button>
        </div>

        {loading && initialLoad ? (
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
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 md:hidden">
              {newestGoods.slice(0, 4).map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex-shrink-0 w-40"
                >
                  <GoodsItem g={g} onClick={() => navigate(`/goods/${g.id}`)} />
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
                  transition={{ delay: i * 0.08 }}
                >
                  <GoodsItem g={g} onClick={() => navigate(`/goods/${g.id}`)} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Hot Goods */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg md:text-xl">热门推荐</h2>
        </div>

        {loading && initialLoad ? (
          <Skeleton.Grid count={4} cols={2} />
        ) : hotGoods.length === 0 ? (
          !loading && (
            <EmptyState
              message="该分类暂无商品"
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
                transition={{ delay: i * 0.06 }}
              >
                <GoodsItem g={g} onClick={() => navigate(`/goods/${g.id}`)} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[70vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📢</span>
                <h2 className="font-bold text-lg">{selectedAnnouncement.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
              {selectedAnnouncement.content || '暂无详细内容'}
            </p>
            {selectedAnnouncement.createdAt && (
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
                发布于 {formatTime(selectedAnnouncement.createdAt)}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function GoodsItem({ g, onClick }: { g: any; onClick: () => void }) {
  const isOwner = g.userId === (useAuthStore.getState().user?.id);
  // 发布者总是看原图，其他人看图审状态
  const getImgSrc = (img: any) => {
    if (typeof img === 'string') return img;
    return isOwner ? img.url : (img.pending ? img.blurredUrl : img.url);
  };
  const firstImg = g.images?.[0];
  const priceLabel =
    g.listType === 'rent' || g.listType === 'rent_want'
      ? `¥${g.price}/天`
      : g.listType === 'buy'
        ? `求 ¥${g.price}`
        : `¥${g.price}`;

  const typeTag =
    g.listType === 'sale'
      ? { label: '出', color: 'bg-green-50 text-green-600' }
      : g.listType === 'rent'
        ? { label: '租', color: 'bg-emerald-50 text-emerald-600' }
        : g.listType === 'buy'
          ? { label: '求', color: 'bg-red-50 text-red-600' }
          : { label: '求租', color: 'bg-orange-50 text-orange-600' };

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden cursor-pointer hover-lift group"
    >
      <div className="h-28 md:h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-3xl md:text-4xl relative overflow-hidden">
        {firstImg ? (
          <img
            src={getImgSrc(firstImg)}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span>📦</span>
        )}
        <span
          className={`absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${typeTag.color}`}
        >
          {typeTag.label}
        </span>
        {g.status === 'sold' && (
          <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-gray-800/80 text-white backdrop-blur-sm">
            已售
          </span>
        )}
        {g.hasPendingImages && (
          <span className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-yellow-50/90 text-yellow-600 backdrop-blur-sm">
            🕐 图片审核中
          </span>
        )}
      </div>
      <div className="p-2.5 md:p-3">
        {g.categoryName && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-600 inline-block mb-1">
            {g.categoryIcon} {g.categoryName}
          </span>
        )}
        <p className="text-sm font-medium line-clamp-2 text-gray-800 dark:text-gray-100 min-h-[2.5rem]">
          {g.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><FiEye className="text-[10px]" /> {g.viewCount || 0}</span>
          {g.condition && <span>{g.condition === 'brand_new' ? '全新' : g.condition === 'like_new' ? '几乎全新' : g.condition === 'used' ? '正常使用' : '有磨损'}</span>}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-red-500 font-bold text-sm md:text-base">
            {priceLabel}
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-[var(--color-card-hover)] px-1.5 py-0.5 rounded-full">
            {CAMPUS_MAP[g.campus as keyof typeof CAMPUS_MAP] || g.campus}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
