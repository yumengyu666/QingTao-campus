import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { FiUsers } from 'react-icons/fi';

export default function FollowListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isFollowing = location.pathname.includes('following');
  const title = isFollowing ? '我的关注' : '我的粉丝';

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const endpoint = isFollowing ? `/api/users/${user.id}/following` : `/api/users/${user.id}/followers`;
    apiFetch(endpoint)
      .then(r => r.json())
      .then(json => { if (json.code === 200) setList(json.data.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, isFollowing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Header title={title} rightAction={!loading && list.length > 0 ? <span className="text-xs text-gray-400 font-normal">{list.length} 人</span> : undefined} />
      {loading ? (
        <div className="p-4"><Skeleton.List rows={4} /></div>
      ) : list.length === 0 ? (
        <EmptyState message={isFollowing ? '还没有关注任何人' : '还没有粉丝'} icon={<FiUsers className="text-5xl mb-4" />} />
      ) : (
        <div className="px-4 md:px-0 space-y-1 mt-4">
          {list.map((u: any) => (
            <div key={u.id} onClick={() => navigate(`/user/${u.id}`)}
              className="flex items-center gap-3 bg-white dark:bg-[var(--color-card)] rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
              <UserAvatar src={u.avatarUrl} nickname={u.nickname} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{u.nickname}</p>
                <p className="text-xs text-gray-400 truncate">{u.bio}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
