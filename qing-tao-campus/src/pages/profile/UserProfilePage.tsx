import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { CampusTag } from '@/components/common/CampusTag';
import { ReputationBadge } from '@/components/common/ReputationBadge';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { LazyImage } from '@/components/common/LazyImage';
import { FiCopy, FiUserPlus, FiUserCheck, FiMessageCircle } from 'react-icons/fi';
import { DEFAULT_CATEGORIES, CAMPUS_MAP } from '@/utils/constants';
import { STATUS_MAP } from '@/types/goods';
import { formatTime } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [profile, setProfile] = useState<any>(null);
  const [goods, setGoods] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'goods' | 'posts' | 'notes' | 'reviews'>('goods');
  const [tabCache, setTabCache] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Load profile
    apiFetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) {
          setProfile(json.data);
          setIsFollowing(json.data.isFollowing);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load goods
    apiFetch(`/api/users/${id}/goods?pageSize=8`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) setGoods(json.data.list || []);
      })
      .catch(() => {});

    // Load posts
    apiFetch(`/api/users/${id}/posts?pageSize=5`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) setPosts(json.data.list || []);
      })
      .catch(() => {});

    // Load notes
    apiFetch(`/api/notes?pageSize=12`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) setNotes((json.data?.list || []).filter((n: any) => n.user?.id === parseInt(id!)));
      })
      .catch(() => {});

    // Load reviews
    apiFetch(`/api/users/${id}/reviews?pageSize=10`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) setReviews(json.data);
      })
      .catch(() => {});
  }, [id, token]);

  const handleFollow = async () => {
    if (!token) { toast.error('请先登录'); return; }
    try {
      if (isFollowing) {
        const res = await apiFetch(`/api/users/${id}/follow`, { method: 'DELETE' });
        const json = await res.json();
        if (json.code === 200) { setIsFollowing(false); toast.success('已取消关注'); }
        else toast.error(json.message);
      } else {
        const res = await apiFetch(`/api/users/${id}/follow`, { method: 'POST' });
        const json = await res.json();
        if (json.code === 200) { setIsFollowing(true); toast.success('已关注'); }
        else toast.error(json.message);
      }
    } catch { toast.error('网络错误'); }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('已复制');
  };

  if (loading) return <div><Header title="用户主页" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!profile) return <div><Header title="用户主页" /><p className="text-center text-gray-400 py-12">用户不存在</p></div>;

  if (profile.isDisabled) {
    return (
      <div>
        <Header title="用户主页" />
        <div className="bg-white dark:bg-[var(--color-card)] mx-4 mt-4 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto flex items-center justify-center text-2xl mb-4">👤</div>
          <h2 className="font-bold text-lg text-gray-500">{profile.nickname}</h2>
          <p className="text-sm text-gray-400 mt-1">该用户已注销</p>
          <p className="text-xs text-gray-300 mt-3">该账号已注销，所有商品已下架</p>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.id === profile.id;

  return (
    <div>
      <Header title="用户主页" />

      {/* Profile */}
      <div className="bg-white dark:bg-[var(--color-card)] mx-4 mt-4 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <UserAvatar src={profile.avatarUrl} nickname={profile.nickname} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">{profile.nickname}</h2>
              {profile.campusArea && <CampusTag campus={profile.campusArea} />}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{profile.bio || '这个人很懒，什么都没写'}</p>
            {profile.reputationLabel && (
              <span className="inline-block mt-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium">
                {profile.reputationLabel}
              </span>
            )}
            <div className="mt-2">
              <ReputationBadge
                tradeCount={profile.tradeCount || 0}
                approvalRate={profile.approvalRate || 0}
                level={profile.reputationLabel}
              />
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              {profile.mutualFollowCount > 0 && <span className="text-green-500 text-xs">🏷 {profile.mutualFollowCount}个共同关注</span>}
              <span><b>{profile.followCount}</b> 关注</span>
              <span><b>{profile.fansCount}</b> 粉丝</span>
              <span><b>{profile.goodsCount}</b> 商品</span>
            </div>
          </div>
        </div>
        {!isSelf && (
          <div className="flex gap-2 mt-4">
            <button onClick={handleFollow}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isFollowing ? 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600' : 'bg-indigo-500 text-white'}`}>
              {isFollowing ? <><FiUserCheck /> 已关注</> : <><FiUserPlus /> 关注</>}
            </button>
            <button
              onClick={() => navigate(`/messages/${profile.id}`)}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-indigo-600 text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-[0.97] transition-all"
            >
              <FiMessageCircle />
              私信
            </button>
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="bg-white dark:bg-[var(--color-card)] mx-4 mt-3 rounded-2xl p-5">
        <h3 className="font-medium text-sm mb-3">联系方式</h3>
        {profile.wechat && (
          <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-[var(--color-border)]">
            <span className="text-sm text-gray-500">微信：{profile.wechat}</span>
            <button onClick={() => copyText(profile.wechat)} className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded"><FiCopy /> 复制</button>
          </div>
        )}
        {profile.qq && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">QQ：{profile.qq}</span>
            <button onClick={() => copyText(profile.qq)} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"><FiCopy /> 复制</button>
          </div>
        )}
        {!profile.wechat && !profile.qq && <p className="text-sm text-gray-400">暂未填写联系方式</p>}
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-[var(--color-card)] mx-4 mt-3 rounded-2xl overflow-hidden">
        <button onClick={() => setTab('goods')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${tab === 'goods' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          📦 商品 ({goods.length})
        </button>
        <button onClick={() => setTab('posts')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${tab === 'posts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          📋 帖子 ({posts.length})
        </button>
        <button onClick={() => setTab('notes')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${tab === 'notes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          📓 笔记 ({notes.length})
        </button>
        <button onClick={() => setTab('reviews')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${tab === 'reviews' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'}`}>
          ⭐ 评价 ({reviews?.totalReviews || 0})
        </button>
      </div>

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div className="mx-4 mt-3 columns-2 gap-3">
          {notes.length === 0 ? (
            <EmptyState message="暂无笔记" variant="compact" />
          ) : notes.map((n: any) => {
            const imgs = typeof n.images === 'string' ? JSON.parse(n.images) : (n.images || []);
            const cover = n.videoCover || imgs[n.coverIndex || 0] || imgs[0];
            return (
              <div key={n.id} onClick={() => navigate(`/explore/note/${n.id}`)}
                className="break-inside-avoid mb-3 bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden shadow-sm cursor-pointer">
                {cover ? <LazyImage src={cover} alt="" className="w-full" aspectRatio="3/4" />
                  : <div className="aspect-[3/4] flex items-center justify-center text-3xl bg-gray-100 dark:bg-gray-700">📝</div>}
                <div className="p-2.5">
                  <div className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2">{n.title}</div>
                  <div className="text-[10px] text-gray-400 mt-1">❤️ {n.likeCount || 0}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <div className="mx-4 mt-3">
          {!reviews ? (
            <Skeleton.List rows={3} />
          ) : reviews.list?.length === 0 ? (
            <EmptyState message="暂无交易评价" variant="compact" />
          ) : (
            <div className="space-y-3">
              {/* Rating Summary */}
              <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-4 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">{reviews.avgRating}</div>
                  <div className="text-xs text-gray-400">{reviews.totalReviews} 条评价</div>
                </div>
                <div className="flex-1">
                  {[5,4,3,2,1].map(star => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-right text-gray-500">{star}星</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{
                          width: `${Math.max(reviews.list.filter(function(r) { return r.rating === star; }).length / Math.max(reviews.totalReviews, 1) * 100, 3)}%`
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Review List */}
              {reviews.list.map((r: any) => (
                <div key={r.id} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.reviewer?.nickname || '匿名'}</span>
                      <div className="flex text-amber-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>}
                  {r.goodsTitle && <p className="text-xs text-gray-400 mt-1">商品：{r.goodsTitle}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goods Tab */}
      {tab === 'goods' && (
        <div className="mx-4 mt-3">
          {goods.length === 0 ? (
            <EmptyState message="暂无商品" variant="compact" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {goods.map((g) => (
                <div key={g.id} onClick={() => navigate(`/goods/${g.id}`)}
                  className="bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform">
                  <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-2xl">
                    {(g.images && g.images.length > 0) ? (
                      <LazyImage src={g.images[0]} alt="" className="w-full h-full" />
                    ) : (
                      '📦'
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{g.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-red-500 font-bold text-sm">¥{g.price}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${STATUS_MAP[g.status as keyof typeof STATUS_MAP]?.color || 'bg-gray-400'}`}>
                        {STATUS_MAP[g.status as keyof typeof STATUS_MAP]?.label || g.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {tab === 'posts' && (
        <div className="mx-4 mt-3">
          {posts.length === 0 ? (
            <EmptyState message="暂无帖子" variant="compact" />
          ) : (
            <div className="space-y-2">
              {posts.map((p) => (
                <div key={p.id} onClick={() => navigate(`/square/post/${p.id}`)}
                  className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
                  <p className="text-sm font-medium">{p.title}</p>
                  <span className="text-xs text-gray-400 mt-1">👁 {p.viewCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
