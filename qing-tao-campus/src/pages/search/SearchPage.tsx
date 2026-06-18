import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { useSearchStore } from '@/stores/searchStore';
import { useDebounce } from '@/hooks/useUtils';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { LazyImage } from '@/components/common/LazyImage';
import { apiFetch } from '@/utils/api';
import { FiSearch, FiX, FiClock, FiTrendingUp } from 'react-icons/fi';
import { CAMPUS_MAP } from '@/utils/constants';

type SearchType = 'all' | 'goods' | 'posts' | 'lostfound' | 'qa';

const typeTabs: { key: SearchType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'goods', label: '商品' },
  { key: 'posts', label: '帖子' },
  { key: 'lostfound', label: '失物招领' },
  { key: 'qa', label: '答疑' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as SearchType) || 'all';

  const { history, addHistory, removeHistory, clearHistory } = useSearchStore();
  const [keyword, setKeyword] = useState('');
  const [focused, setFocused] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hotSearches, setHotSearches] = useState<string[]>([]);
  const debouncedKeyword = useDebounce(keyword, 400);

  useEffect(() => {
    apiFetch('/api/search/hot').then(r => r.json()).then(j => {
      if (j.code === 200) setHotSearches(j.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!debouncedKeyword.trim()) { setResults([]); setTotal(0); return; }
    setLoading(true);
    const typeParam = searchType !== 'all' ? `&type=${searchType}` : '';
    apiFetch(`/api/search?keyword=${encodeURIComponent(debouncedKeyword.toLowerCase())}${typeParam}`)
      .then(r => r.json())
      .then(j => {
        if (j.code === 200) { setResults(j.data.list || []); setTotal(j.data.total || 0); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedKeyword, searchType]);

  const handleSearch = (kw: string) => {
    if (kw.trim()) {
      addHistory(kw.trim());
      setKeyword(kw.trim());
    }
  };

  const handleResultClick = (item: any) => {
    addHistory(item.title || item.nickname || keyword);
    if (item.type === 'goods') navigate(`/goods/${item.id}`);
    else if (item.type === 'post') navigate(`/square/post/${item.id}`);
    else if (item.type === 'lostfound') navigate(`/square/lostfound/${item.id}`);
    else if (item.type === 'qa') navigate(`/qa/${item.id}`);
    else if (item.type === 'user') navigate(`/user/${item.id}`);
  };

  return (
    <div>
      <Header title="搜索" />
      <div className="px-4 py-3 bg-white dark:bg-[var(--color-card)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="搜索商品、帖子或失物..." value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(keyword)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] focus:bg-gray-50 dark:focus:bg-[var(--color-card-hover)] outline-none transition-colors text-sm"
              autoFocus
            />
            {keyword && (
              <button onClick={() => { setKeyword(''); setResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5">
                <FiX className="text-gray-400 text-sm" />
              </button>
            )}
          </div>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 flex-shrink-0">取消</button>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-2 bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)]">
        {typeTabs.map((t) => (
          <button key={t.key} onClick={() => setSearchType(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${searchType === t.key ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {debouncedKeyword && (
        <div className="divide-y divide-gray-50 dark:divide-[var(--color-border)]">
          {loading ? (
            <div className="p-4"><Skeleton.List rows={3} /></div>
          ) : results.length === 0 ? (
            <EmptyState message="未找到相关结果" description="换个关键词或切换搜索类型试试" icon={<FiSearch className="text-4xl" />} variant="compact" />
          ) : (
            results.map((item) => (
              <div key={`${item.type}-${item.id}`} onClick={() => handleResultClick(item)}
                className="px-4 py-3 bg-white dark:bg-[var(--color-card)] cursor-pointer active:bg-gray-50 dark:active:bg-[var(--color-card-hover)] flex items-center gap-3">
                {/* Thumbnail */}
                {item.type === 'user' ? (
                  item.avatarUrl ? (
                    <LazyImage src={item.avatarUrl} alt="" className="w-12 h-12 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(item.nickname || item.username)?.[0]}
                    </div>
                  )
                ) : item.images?.length > 0 ? (
                  <LazyImage src={item.images[0]} alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] flex items-center justify-center text-lg flex-shrink-0">
                    {item.type === 'goods' ? '📦' : item.type === 'post' ? '📝' : item.type === 'lostfound' ? '🔍' : item.type === 'qa' ? '❓' : '🔍'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.type === 'goods' ? 'bg-blue-50 text-blue-600' :
                    item.type === 'post' ? 'bg-green-50 text-green-600' :
                    item.type === 'lostfound' ? 'bg-orange-50 text-orange-600' :
                    item.type === 'qa' ? 'bg-teal-50 text-teal-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>
                    {item.type === 'goods' ? '商品' : item.type === 'post' ? '帖子' : item.type === 'lostfound' ? '失物招领' : item.type === 'qa' ? '答疑' : '用户'}
                  </span>
                  <span className="text-sm truncate">{item.title || item.nickname || item.username}</span>
                </div>
                {item.type === 'goods' && item.price !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-red-500 text-sm font-bold">¥{item.price}</span>
                  </div>
                )}
                {item.type === 'lostfound' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${item.lostfoundType === 'lost' ? 'text-red-500' : 'text-green-500'}`}>
                      {item.lostfoundType === 'lost' ? '丢失' : '捡到'}
                    </span>
                    {item.location && <span className="text-[10px] text-gray-400">{item.location}</span>}
                  </div>
                )}
                {item.type === 'user' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">@{item.username}</span>
                    {item.campusArea && <span className="text-[10px] text-gray-400">{CAMPUS_MAP[item.campusArea as keyof typeof CAMPUS_MAP] || item.campusArea}</span>}
                  </div>
                )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!debouncedKeyword && (
        <div className="p-4">
          {history.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2"><FiClock /> 搜索历史</h3>
                <button onClick={clearHistory} className="text-xs text-gray-400"><FiX /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button key={h} onClick={() => handleSearch(h)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm text-gray-600 dark:text-[var(--color-text-secondary)] group">
                    {h}
                    <FiX className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); removeHistory(h); }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3"><FiTrendingUp /> 热门搜索</h3>
            <div className="flex flex-wrap gap-2">
              {hotSearches.map((h) => (
                <button key={h} onClick={() => handleSearch(h)}
                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm text-gray-600 dark:text-[var(--color-text-secondary)]">
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
