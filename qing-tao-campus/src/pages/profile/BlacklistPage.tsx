import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiUnlock } from 'react-icons/fi';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { Header } from '@/components/layout/Header';

interface BlockedUser {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string;
}

export default function BlacklistPage() {
  const [list, setList] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchList = async () => {
    try {
      const res = await apiFetch('/api/block');
      const json = await res.json();
      if (json.code === 200) {
        const raw = json.data?.list || json.data || [];
        setList(raw.map((b: any) => b.blocked || b));
      }
    } catch { toast.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const handleUnblock = async (userId: number) => {
    try {
      const res = await apiFetch(`/api/block/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已取消拉黑');
        setList(prev => prev.filter(u => u.id !== userId));
      }
    } catch { toast.error('操作失败'); }
  };

  if (loading) return <div><Header title="黑名单" /><div className="p-4"><Skeleton.List /></div></div>;

  return (
    <div>
      <Header title="黑名单" />
      <div className="p-4">

      {list.length === 0 ? (
        <EmptyState icon={<FiUser />} message="黑名单为空" description="你没有拉黑任何用户" />
      ) : (
        <div className="space-y-2">
          {list.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-card)] rounded-xl">
              <button onClick={() => navigate(`/user/${user.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <UserAvatar src={user.avatarUrl} nickname={user.nickname || user.username} size="md" />
                <span className="font-medium text-sm truncate">{user.nickname || user.username}</span>
              </button>
              <button
                onClick={() => handleUnblock(user.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <FiUnlock className="text-xs" />
                取消拉黑
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
