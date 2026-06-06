import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/utils/api';
import { Skeleton } from '@/components/common/Skeleton';
import { formatTime } from '@/utils/format';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.set('keyword', keyword);
      const res = await apiFetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (json.code === 200) {
        setUsers(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch { /* apiFetch handles 401 */ }
    setLoading(false);
  }, [page, keyword]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'disabled' ? '冻结' : '解冻';
    if (!confirm(`确定要${action}该用户吗？${newStatus === 'disabled' ? '冻结后用户将无法登录' : ''}`)) return;

    const res = await apiFetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.code === 200) {
      toast.success(json.message);
      fetchUsers();
    } else {
      toast.error(json.message || '操作失败');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('确定要删除该用户吗？此操作会禁用账号并清理其所有内容，不可恢复！')) return;

    const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.code === 200) {
      toast.success(json.message);
      fetchUsers();
    } else {
      toast.error(json.message || '操作失败');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">用户管理</h2>
        <button onClick={() => navigate('/admin')} className="text-sm text-indigo-500">← 返回</button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          placeholder="搜索用户名/昵称..."
          className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {loading ? (
        <div className="p-4"><Skeleton.List rows={5} /></div>
      ) : (
        <>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white dark:bg-[var(--color-card)] rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm flex-shrink-0">
                  {(u.nickname || u.username)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{u.nickname || u.username}</span>
                    {u.role === 'admin' && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">管理员</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${u.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {u.status === 'active' ? '正常' : '已冻结'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{u.username} · {formatTime(u.createdAt)}</p>
                </div>
                {u.role !== 'admin' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(u.id, u.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${u.status === 'active' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {u.status === 'active' ? '冻结' : '解冻'}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-[var(--color-card)] disabled:opacity-40">上一页</button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-[var(--color-card)] disabled:opacity-40">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
