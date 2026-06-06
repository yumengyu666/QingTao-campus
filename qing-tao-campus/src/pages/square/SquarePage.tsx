import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { LostFoundList } from './LostFoundList';
import { formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import { FiMessageSquare, FiEdit3, FiSearch, FiHeart, FiHelpCircle, FiHash, FiFolder } from 'react-icons/fi';

export default function SquarePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'posts' | 'lostfound'>('posts');
  const [sort, setSort] = useState<'newest' | 'hot'>('newest');
  const [keyword, setKeyword] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== 'posts') return;
    setLoading(true);
    const params = new URLSearchParams();
    if (sort === 'hot') params.set('sort', 'hot');
    if (keyword) params.set('keyword', keyword);
    apiFetch(`/api/posts?${params.toString()}`)
      .then(r => r.json()).then(json => { if (json.code === 200) setPosts(json.data.list || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [tab, sort, keyword]);

  return (
    <div>
      {/* Header with quick links */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold">广场</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/treehole')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <FiHash className="text-xs" /> 树洞
          </button>
          <button onClick={() => navigate('/resources')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <FiFolder className="text-xs" /> 资料
          </button>
          <button onClick={() => navigate('/dating')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors">
            <FiHeart className="text-xs" /> 恋爱空间
          </button>
          <button onClick={() => navigate('/qa')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            <FiHelpCircle className="text-xs" /> 答疑
          </button>
        </div>
      </div>

      {/* 2-Tab bar */}
      <div className="flex bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)]">
        <button onClick={() => setTab('posts')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${tab === 'posts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          📋 帖子
        </button>
        <button onClick={() => setTab('lostfound')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${tab === 'lostfound' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          🔍 失物招领
        </button>
      </div>

      {tab === 'posts' ? (
        <>
          {/* Search + Sort row */}
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input type="text" placeholder="搜索帖子..." value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-8 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-[var(--color-card-hover)] outline-none text-sm" />
            </div>
            <button onClick={() => setSort('newest')} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${sort === 'newest' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>最新</button>
            <button onClick={() => setSort('hot')} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${sort === 'hot' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>最热</button>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="px-4"><Skeleton.List rows={4} /></div>
          ) : posts.length === 0 ? (
            <EmptyState message="暂无帖子" icon={<FiMessageSquare className="text-5xl mb-4 text-gray-300" />} />
          ) : (
            <div className="px-4 space-y-2">
              {posts.map((post) => (
                <div key={post.id} onClick={() => navigate(`/square/post/${post.id}`)}
                  className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-all">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {post.user?.nickname?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-1 text-sm">{post.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.content}</p>
                      {post.images?.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {post.images.slice(0, 3).map((img: string, i: number) => (
                            <div key={i} className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden"><img src={img} alt="" className="w-full h-full object-cover" /></div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>{post.user?.nickname}</span>
                        <span>{formatTime(post.createdAt)}</span>
                        <span>👁 {post.viewCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <LostFoundList />
      )}

      {/* FAB */}
      <button
        onClick={() => navigate(tab === 'posts' ? '/publish/post' : '/publish/lostfound')}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <FiEdit3 className="text-2xl" />
      </button>
    </div>
  );
}
