import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { EndOfList } from '@/components/common/EndOfList';
import { Pagination } from '@/components/common/Pagination';
import { BackToTop } from '@/components/common/BackToTop';
import { LazyImage } from '@/components/common/LazyImage';
import { ShimmerCard } from '@/components/ui/ShimmerCard';
import { CONDITION_COLORS, CAMPUS_MAP } from '@/utils/constants';
import { CONDITION_MAP } from '@/types/goods';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/stores/authStore';
import { FiSearch, FiChevronLeft, FiChevronRight, FiSliders, FiBarChart2 } from 'react-icons/fi';
import { useCompareStore } from '@/stores/compareStore';
import { useCampusStore } from '@/stores/campusStore';

type SortType = 'newest' | 'price_asc' | 'price_desc' | 'hot';

export default function GoodsListPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const compareStore = useCompareStore();
  const campusStore = useCampusStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = Number(searchParams.get('categoryId')) || 0;
  const activeCampus = campusStore.campus; // Uses global campus store instead of URL param
  const [sort, setSort] = useState<SortType>('newest');
  const [conditions, setConditions] = useState<string[]>([]);
  const [listType, setListType] = useState(searchParams.get('listType') || '');
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceError, setPriceError] = useState('');
  const [goods, setGoods] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollL, setCanScrollL] = useState(false);
  const [canScrollR, setCanScrollR] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string; icon: string }[]>([]);
  const [page, setPage] = useState(1);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollL(el.scrollLeft > 2);
    setCanScrollR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, categories]); // 分类加载后重新检测是否需要箭头

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (activeCategory) params.set('categoryId', String(activeCategory));
    if (activeCampus) params.set('campus', activeCampus);
    if (conditions.length > 0) params.set('condition', conditions.join(','));
    if (listType) params.set('listType', listType);
    if (keyword) params.set('keyword', keyword);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (sort === 'price_asc') {
      params.set('sort', 'price');
      params.set('order', 'asc');
    } else if (sort === 'price_desc') {
      params.set('sort', 'price');
      params.set('order', 'desc');
    } else if (sort === 'hot') params.set('sort', 'view_count');

    apiFetch(`/api/goods?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 200) {
          setGoods(json.data.list || []);
          setTotal(json.data.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setInitialLoad(false);
      });
  }, [activeCategory, activeCampus, conditions, keyword, sort, listType, page, priceMin, priceMax]);

  useEffect(() => {
    apiFetch('/api/categories').then(r => r.json())
      .then(j => { if (j.code === 200) setCategories(j.data || []); })
      .catch(() => {});
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const setCategory = (catId: number) => {
    const params = new URLSearchParams(searchParams);
    if (catId) params.set('categoryId', String(catId));
    else params.delete('categoryId');
    setSearchParams(params);
    setPage(1);
  };

  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'newest', label: '最新' },
    { key: 'price_asc', label: '价格↑' },
    { key: 'price_desc', label: '价格↓' },
    { key: 'hot', label: '热度' },
  ];

  return (
    <div>
      <Header title="商品列表" />

      {/* Search Bar */}
      <div className="px-4 py-3 bg-white dark:bg-[var(--color-card)]">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索商品..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] focus:bg-gray-50 dark:focus:bg-[var(--color-card-hover)] outline-none text-sm transition-all focus:ring-2 focus:ring-indigo-400/30"
          />
        </div>
      </div>

      {/* Category Tabs — 桌面端左右箭头，移动端滑动 */}
      <div className="relative bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)]">
        {/* 左箭头 */}
        <button
          onClick={() => scroll('left')}
          className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white dark:bg-[var(--color-card-hover)] shadow-lg border border-gray-200 dark:border-[var(--color-border)] hover:shadow-xl transition-all ${
            canScrollL ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <FiChevronLeft className="text-base" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide px-2 py-2.5 md:px-10"
        >
          <button
            onClick={() => setCategory(0)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
              activeCategory === 0
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--color-card-hover)]'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(activeCategory === cat.id ? 0 : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                activeCategory === cat.id
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--color-card-hover)]'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
        {/* 右箭头 */}
        <button
          onClick={() => scroll('right')}
          className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white dark:bg-[var(--color-card-hover)] shadow-lg border border-gray-200 dark:border-[var(--color-border)] hover:shadow-xl transition-all ${
            canScrollR ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <FiChevronRight className="text-base" />
        </button>
      </div>

      {/* Sort & Filter */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)]">
        {/* Campus quick toggle */}
        <button onClick={() => campusStore.toggle()}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            campusStore.campus ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'
          }`}>
          {campusStore.campus ? `🏫 ${CAMPUS_MAP[campusStore.campus as keyof typeof CAMPUS_MAP] || campusStore.campus}` : '🌐 全部校区'}
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
        {sortOptions.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              sort === s.key
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500 hover:bg-gray-200 dark:hover:bg-[var(--color-card-hover)]'
            }`}
          >
            {s.label}
          </button>
        ))}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
            showFilters || conditions.length > 0 || listType
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500 hover:bg-gray-200 dark:hover:bg-[var(--color-card-hover)]'
          }`}
        >
          <FiSliders className="text-[11px]" /> 筛选
          {(conditions.length > 0 || listType) && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          )}
        </button>

        {activeCampus && (
          <span className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full font-medium">
            {CAMPUS_MAP[activeCampus as keyof typeof CAMPUS_MAP]}
          </span>
        )}
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 py-3 bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)] flex flex-wrap gap-2 overflow-hidden"
        >
          {/* Multi-select condition */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CONDITION_MAP).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setConditions(prev => prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k])}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                  conditions.includes(k)
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <select
            value={listType}
            onChange={(e) => setListType(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] outline-none border-0"
          >
            <option value="">全部交易类型</option>
            <option value="sale">出售</option>
            <option value="buy">求购</option>
            <option value="rent">出租</option>
            <option value="rent_want">求租</option>
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number" placeholder="最低价" value={priceMin}
              onChange={(e) => { const v = e.target.value; if (v && isNaN(Number(v))) { setPriceError('请输入有效价格'); return; } setPriceError(''); setPriceMin(v); }}
              className="w-20 px-2.5 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] outline-none border-0"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="number" placeholder="最高价" value={priceMax}
              onChange={(e) => { const v = e.target.value; if (v && isNaN(Number(v))) { setPriceError('请输入有效价格'); return; } setPriceError(''); setPriceMax(v); }}
              className="w-20 px-2.5 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] outline-none border-0"
            />
          </div>
          {priceError && <span className="text-xs text-red-400">{priceError}</span>}
          {(conditions.length > 0 || listType || priceMin || priceMax) && (
            <button
              onClick={() => {
                setConditions([]);
                setListType('');
              }}
              className="px-3 py-1.5 rounded-full text-xs bg-red-50 text-red-500 font-medium hover:bg-red-100 transition-colors"
            >
              清除筛选
            </button>
          )}
        </motion.div>
      )}

      <div className="px-4 py-2.5 text-xs text-gray-400 font-medium">
        共 {total} 件商品
      </div>

      {/* Goods Grid */}
      {loading && initialLoad ? (
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ShimmerCard key={i} lines={2} avatar={false} className="h-56" />
          ))}
        </div>
      ) : goods.length === 0 ? (
        <EmptyState
          message="暂无符合条件的商品"
          description="试试调整筛选条件或搜索关键词"
        />
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {goods.map((g, i) => {
            const currentUserId = useAuthStore.getState().user?.id;
            const isOwner = g.userId === currentUserId;
            const getImgSrc = (img: any) => {
              if (typeof img === 'string') return img;
              return isOwner ? img.url : (img.pending ? img.blurredUrl : img.url);
            };
            const firstImg = g.images?.[0];
            return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/goods/${g.id}`)}
              className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden cursor-pointer hover-lift group"
            >
              <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-4xl relative overflow-hidden">
                {firstImg ? (
                  <LazyImage
                    src={getImgSrc(firstImg)}
                    alt={g.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    placeholderColor={isOwner ? '#f0fdf4' : '#f3f4f6'}
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
                {g.hasPendingImages && (
                  <span className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-yellow-50/90 text-yellow-600 backdrop-blur-sm">
                    🕐 图片审核中
                  </span>
                )}
                {g.status === 'sold' && (
                  <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-gray-800/80 text-white backdrop-blur-sm">
                    已售
                  </span>
                )}
                {g.status !== 'sold' && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const result = compareStore.addItem({
                      id: g.id, title: g.title, price: g.price,
                      images: Array.isArray(g.images) ? g.images.map((i: any) => typeof i === 'string' ? i : i.url) : [],
                      condition: g.condition, campus: g.campus || '',
                      categoryName: g.categoryName,
                    });
                    if (result.ok) {
                      import('react-hot-toast').then(m => m.default.success('已加入对比'));
                    } else {
                      import('react-hot-toast').then(m => m.default.error(result.message));
                    }
                  }}
                    className={`absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium backdrop-blur-sm ${
                      compareStore.hasItem(g.id) ? 'bg-indigo-500/90 text-white' : 'bg-white/80 text-gray-600'
                    }`}>
                    {compareStore.hasItem(g.id) ? '✓ 已对比' : '⇆ 对比'}
                  </button>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-2 text-gray-800 dark:text-gray-100">
                  {g.title}
                </p>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {g.categoryName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-600">
                      {g.categoryIcon} {g.categoryName}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CONDITION_COLORS[g.condition as keyof typeof CONDITION_COLORS] || 'text-gray-600 bg-gray-50'}`}
                  >
                    {CONDITION_MAP[g.condition as keyof typeof CONDITION_MAP] || g.condition}
                  </span>
                  {(g.listType === 'sale' || g.listType === 'rent') && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-50 text-green-600">
                      {g.listType === 'sale' ? '出' : '租'}
                    </span>
                  )}
                  {(g.listType === 'buy' || g.listType === 'rent_want') && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-600">
                      {g.listType === 'buy' ? '求' : '求租'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-red-500 font-bold text-base">
                      {(g.listType === 'rent' || g.listType === 'rent_want')
                        ? `¥${g.price}/天`
                        : g.listType === 'buy'
                          ? `求 ¥${g.price}`
                          : `¥${g.price}`}
                    </span>
                    {g.originalPrice && g.listType === 'sale' && (
                      <span className="text-xs text-gray-400 line-through">
                        ¥{g.originalPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-[var(--color-card-hover)] px-1.5 py-0.5 rounded-full">
                    {CAMPUS_MAP[g.campus as keyof typeof CAMPUS_MAP]}
                  </span>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {!loading && goods.length > 0 && total <= goods.length && (
        <EndOfList />
      )}

      <Pagination page={page} total={total} pageSize={12} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      <BackToTop />

      {/* Floating Compare Bar */}
      {compareStore.items.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-between bg-indigo-600 text-white rounded-xl px-4 py-3 shadow-lg shadow-indigo-500/30">
          <span className="text-sm font-medium">
            已选 {compareStore.items.length}/4 个商品
          </span>
          <div className="flex gap-2">
            <button onClick={() => compareStore.clearAll()}
              className="px-3 py-1 text-xs bg-white/20 rounded-lg">清空</button>
            <button onClick={() => nav('/compare')}
              className="px-3 py-1 text-xs bg-white text-indigo-600 rounded-lg font-medium flex items-center gap-1">
              <FiBarChart2 className="text-xs" /> 开始对比
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
