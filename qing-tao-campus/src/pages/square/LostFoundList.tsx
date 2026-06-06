import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { formatTime } from '@/utils/format';
import { CAMPUS_MAP } from '@/utils/constants';
import { apiFetch } from '@/utils/api';
import { FiSearch, FiMapPin } from 'react-icons/fi';

export function LostFoundList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('type', filter);
    if (keyword) params.set('keyword', keyword);
    apiFetch(`/api/lostfound?${params.toString()}`)
      .then(r => r.json())
      .then(json => { if (json.code === 200) setItems(json.data.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, keyword]);

  return (
    <div>
      <div className="px-4 pt-2 pb-2 md:px-0 md:pt-0">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="搜索失物招领..." value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] outline-none text-sm" />
        </div>
      </div>
      <div className="px-4 pb-2 md:px-0 flex gap-2">
        {(['all', 'lost', 'found'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm ${filter === f ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] text-gray-500 border'}`}>
            {f === 'all' ? '全部' : f === 'lost' ? '丢失' : '捡到'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-4"><Skeleton.List rows={3} /></div>
      ) : items.length === 0 ? (
        <EmptyState message="暂无相关信息" icon={<FiMapPin className="text-5xl mb-4" />} />
      ) : (
        <div className="px-4 md:px-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {items.map((item) => (
            <div key={item.id} onClick={() => navigate(`/square/lostfound/${item.id}`)}
              className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] md:hover:shadow-md transition-all flex">
              {/* Thumbnail */}
              <div className="w-24 h-24 bg-gray-100 dark:bg-[var(--color-card-hover)] flex-shrink-0 flex items-center justify-center text-2xl">
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt="" className="w-full h-full object-cover" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span>{item.type === 'lost' ? '😢' : '😊'}</span>
                )}
              </div>
              <div className="flex-1 p-3 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-1.5 py-0.5 rounded text-white ${item.type === 'lost' ? 'bg-red-500' : 'bg-green-500'}`}>
                  {item.type === 'lost' ? '丢失' : '捡到'}
                </span>
                <span className="text-[10px] text-gray-400">{CAMPUS_MAP[item.campus as keyof typeof CAMPUS_MAP]}</span>
                {(item.reward) && <span className="text-[10px] text-amber-500 font-medium">酬谢 ¥{item.reward}</span>}
              </div>
              <h3 className="font-medium text-sm truncate">{item.title}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{item.description || '暂无描述'}</p>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                <span>{item.user?.nickname}</span>
                <span>{formatTime(item.createdAt)}</span>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
