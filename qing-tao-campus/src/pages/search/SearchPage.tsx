import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { useSearchStore } from '@/stores/searchStore';
import { useDebounce } from '@/hooks/useUtils';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { LazyImage } from '@/components/common/LazyImage';
import { apiFetch } from '@/utils/api';
import { FiSearch, FiX, FiClock } from 'react-icons/fi';
import { CAMPUS_MAP } from '@/utils/constants';

type SearchType = 'all' | 'goods' | 'posts' | 'lostfound' | 'qa';

const typeTabs: { key: SearchType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'goods', label: '商品' },
  { key: 'posts', label: '帖子' },
  { key: 'lostfound', label: '失物招领' },
  { key: 'qa', label: '答疑' },
];

const TRENDING_TAGS = ['期末复习资料', 'iPhone', '四六级', '考研', '自行车', '宿舍神器'];

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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const suggestionInputRef = useRef<HTMLDivElement>(null);
  const debouncedSuggestion = useDebounce(keyword, 300);
  const debouncedKeyword = useDebounce(keyword, 400);

  // Search suggestions dropdown — debounce 300ms, fetch goods by keyword
  useEffect(() => {
    if (!debouncedSuggestion.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    const controller = new AbortController();
    apiFetch(`/api/goods?keyword=${encodeURIComponent(debouncedSuggestion)}&pageSize=5`, { signal: controller.signal })
      .then(r => r.json())
      .then(j => {
        if (j.code === 200 && j.data?.list?.length > 0) {
          setSuggestions(j.data.list);
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => { setSuggestions([]); })
      .finally(() => setSuggestionsLoading(false));
    return () => controller.abort();
  }, [debouncedSuggestion]);

  // Full search — fires on Enter or suggestion/tag click
  useEffect(() => {
    if (!searched || !keyword.trim()) { setResults([]); setTotal(0); return; }
    setLoading(true);
    const typeParam = searchType !== 'all' ? `&type=${searchType}` : '';
    apiFetch(`/api/search?keyword=${encodeURIComponent(keyword.toLowerCase())}${typeParam}`)
      .then(r => r.json())
      .then(j => {
        if (j.code === 200) { setResults(j.data.list || []); setTotal(j.data.total || 0); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedKeyword, searchType, searched]);

  useEffect(() => {
    if (searched && keyword.trim()) {
      setSearched(false);
      setSearched(true);
    }
  }, [searchType]);

  const handleSearch = (kw: string) => {
    if (kw.trim()) {
      addHistory(kw.trim());
      setKeyword(kw.trim());
      setSuggestions([]);
      setSearched(true);
    }
  };

  const handleSuggestionClick = (item: any) => {
    addHistory(item.title);
    setSuggestions([]);
    setSearched(false);
    nav(`/goods/${item.id}`);
  };

  const handleResultClick = (item: any) => {
    addHistory(item.title || item.nickname || keyword);
    if (item.type === 'goods') nav(`/goods/${item.id}`);
    else if (item.type === 'post') nav(`/square/post/${item.id}`);
    else if (item.type === 'lostfound') nav(`/square/lostfound/${item.id}`);
    else if (item.type === 'qa') nav(`/qa/${item.id}`);
    else if (item.type === 'user') nav(`/user/${item.id}`);
  };

  return (
    <div>
      <Header title="搜索" />
      <div className="px-4 py-3 bg-white dark:bg-[var(--color-card)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative" ref={suggestionInputRef}>
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="搜索商品、帖子或失物..." value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setSearched(false); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(keyword)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] focus:bg-gray-50 dark:focus:bg-[var(--color-card-hover)] outline-none transition-colors text-sm"
              autoFocus
            />
            {keyword && (
              <button onClick={() => { setKeyword(''); setResults([]); setSuggestions([]); setSearched(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5">
                <FiX className="text-gray-400 text-sm" />
              </button>
            )}

            {/* Search Suggestions Dropdown */}
            {(focused && suggestions.length > 0 && !searched) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--color-card)] rounded-xl shadow-xl border border-gray-100 dark:border-[var(--color-border)] overflow-hidden z-30">
                {suggestionsLoading && (
                  <div className="p-3"><Skeleton.List rows={2} /></div>
                )}
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSuggestionClick(item)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] active:bg-gray-100 dark:active:bg-[var(--color-card-hover)] transition-colors"
                  >
                    {item.images?.[0] ? (
                      <LazyImage src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url || item.images[0]?.blurredUrl} alt="" className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[var(--color-card-hover)] flex items-center justify-center text-lg flex-shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{item.title}</p>
                      {item.price !== undefined && (
                        <p className="text-xs text-red-500 font-bold">¥{item.price}</p>
                      )}
                    </div>
                    <FiSearch className="text-gray-300 text-sm flex-shrink-0" />
                  </div>
                ))}
              </div>
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

      {/* Full search results — shown after Enter */}
      {searched && keyword.trim() && (
        <div className="divide-y divide-gray-50 dark:divide-[var(--color-border)]">
          {loading ? (
            <div className="p-4"><Skeleton.List rows={3} /></div>
          ) : results.length === 0 ? (
            <EmptyState message="未找到相关结果" description="换个关键词或切换搜索类型试试" action={TRENDING_TAGS.length > 0 ? <div className="mt-3"><p className="text-xs text-gray-400 mb-2">热门搜索：</p><div className="flex flex-wrap gap-2 justify-center">{TRENDING_TAGS.map(h => <button key={h} onClick={() => handleSearch(h)} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-xs text-gray-600 dark:text-[var(--color-text-secondary)]">{h}</button>)}</div></div> : undefined} icon={<FiSearch className="text-4xl" />} variant="compact" />
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

      {/* Trending tags + history — shown when no search is active */}
      {!searched && (
        <div className="p-4">
          {/* Trending Search Tags */}
          <div className="mb-6">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <span className="text-base">🔥</span> 热门搜索
            </h3>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button key={tag} onClick={() => handleSearch(tag)}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 text-sm text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-500/20 hover:shadow-sm transition-all active:scale-95">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Search History */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2"><FiClock /> 搜索历史</h3>
                <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition-colors">清除历史</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button key={h} onClick={() => handleSearch(h)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] text-sm text-gray-600 dark:text-[var(--color-text-secondary)] group hover:bg-gray-200 dark:hover:bg-[var(--color-border)] transition-colors">
                    {h}
                    <span
                      onClick={(e) => { e.stopPropagation(); removeHistory(h); }}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <FiX className="text-[10px]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
