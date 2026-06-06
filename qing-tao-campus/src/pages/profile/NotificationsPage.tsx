import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadStore } from '@/stores/unreadStore';
import { formatTime } from '@/utils/format';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';
import { FiBell, FiTrash2, FiCheckCircle } from 'react-icons/fi';

const typeIcons: Record<string, string> = { review_result: '📋', new_follower: '👤', new_comment: '💬', goods_sold: '💰', announcement: '📢', dating_request: '💝', chat_message: '✉️' };

function getNotificationLink(n: any): string | null {
  const id = n.relatedId;
  if (!id) return null;
  switch (n.type) {
    case 'new_comment':
    case 'goods_sold': return `/goods/${id}`;
    case 'new_follower': return `/user/${id}`;
    case 'chat_message': return `/messages/${id}`;
    case 'dating_request': return '/dating';
    case 'review_result': return null; // 审核结果不跳转
    default: return null;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const setUnreadCount = useUnreadStore((s) => s.setCount);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const typeFilters = [
    { key: 'all', label: '全部', icon: '🔔' },
    { key: 'trade', label: '交易', icon: '💰', types: ['trade_intent', 'trade_accepted', 'trade_completed', 'trade_rejected', 'new_review'] },
    { key: 'chat', label: '消息', icon: '💬', types: ['chat_message', 'dating_request'] },
    { key: 'system', label: '系统', icon: '📢', types: ['review_result', 'announcement', 'new_follower', 'price_drop'] },
  ];

  const filteredNotifs = filterType === 'all'
    ? notifs
    : notifs.filter(n => {
        const filter = typeFilters.find(f => f.key === filterType);
        return filter?.types?.includes(n.type);
      });

  const fetchNotifs = () => {
    apiFetch('/api/notifications')
      .then(r => r.json()).then(json => { if (json.code === 200) setNotifs(json.data.list || []); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifs(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllRead = async () => {
    const res = await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    const json = await res.json();
    if (json.code === 200) {
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('全部已读');
    }
  };

  const markRead = async (id: number) => {
    const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    const json = await res.json();
    if (json.code === 200) {
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    }
  };

  const deleteOne = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code === 200) {
        const deleted = notifs.find(n => n.id === id);
        setNotifs(prev => prev.filter(n => n.id !== id));
        setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
        if (deleted && !deleted.isRead) setUnreadCount(c => Math.max(0, c - 1));
        toast.success('已删除');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markSelectedRead = async () => {
    if (selected.size === 0) return;
    try {
      const ids = Array.from(selected);
      const res = await apiFetch('/api/notifications/batch-read', {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.code === 200) {
        const unreadCount = notifs.filter(n => selected.has(n.id) && !n.isRead).length;
        setNotifs(prev => prev.map(n => selected.has(n.id) ? { ...n, isRead: true } : n));
        setUnreadCount(c => Math.max(0, c - unreadCount));
        setSelected(new Set());
        setSelectMode(false);
        toast.success(json.message);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    try {
      const ids = Array.from(selected);
      const res = await apiFetch('/api/notifications/batch', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.code === 200) {
        const unreadDeleted = notifs.filter(n => selected.has(n.id) && !n.isRead).length;
        setNotifs(prev => prev.filter(n => !selected.has(n.id)));
        setUnreadCount(c => Math.max(0, c - unreadDeleted));
        setSelected(new Set());
        setSelectMode(false);
        toast.success(json.message);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const cancelSelect = () => { setSelectMode(false); setSelected(new Set()); };

  return (
    <div>
      <Header title="通知" />
      {/* Type filter tabs */}
      <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide bg-white dark:bg-[var(--color-card)] border-b border-gray-100 dark:border-[var(--color-border)]">
        {typeFilters.map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filterType === f.key ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'
            }`}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>
      <div className="px-4 py-2 flex justify-between items-center">
        <div>
          {selectMode ? (
            <div className="flex gap-2">
              <button onClick={markSelectedRead} disabled={selected.size === 0}
                className="px-3 py-1.5 text-sm text-indigo-500 border border-indigo-300 rounded-lg disabled:opacity-30">标记已读({selected.size})</button>
              <button onClick={deleteSelected} disabled={selected.size === 0}
                className="px-3 py-1.5 text-sm text-red-500 border border-red-300 rounded-lg disabled:opacity-30">删除({selected.size})</button>
              <button onClick={cancelSelect} className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 dark:border-[var(--color-border)] rounded-lg">取消</button>
            </div>
          ) : (
            <button onClick={() => setSelectMode(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-[var(--color-text-secondary)] border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">多选</button>
          )}
        </div>
        <button onClick={markAllRead} className="text-sm text-indigo-500">全部已读</button>
      </div>
      {loading ? <div className="p-4"><Skeleton.List rows={5} /></div>
      : filteredNotifs.length === 0 ? <EmptyState message={filterType === 'all' ? '暂无通知' : '暂无此类通知'} icon={<FiBell className="text-5xl mb-4" />} />
      : (
        <div className="divide-y divide-gray-50 dark:divide-[var(--color-border)]">
          {filteredNotifs.map((n) => {
            const link = getNotificationLink(n);
            return (
              <div key={n.id} onClick={() => selectMode ? toggleSelect(n.id) : (markRead(n.id), link && navigate(link))}
              className={`px-4 py-3 flex items-center gap-3 ${selectMode ? 'cursor-pointer' : link ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)]' : ''} ${n.isRead ? 'bg-white dark:bg-[var(--color-card)]' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
              {selectMode && (
                <button onClick={() => toggleSelect(n.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected.has(n.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-500'}`}>
                  {selected.has(n.id) && <FiCheckCircle className="text-xs" />}
                </button>
              )}
              <span className="text-lg flex-shrink-0">{typeIcons[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                {n.content && <p className="text-xs text-gray-400 mt-0.5">{n.content}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
              </div>
              {!n.isRead && !selectMode && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              {!selectMode && (
                <button onClick={(e) => deleteOne(e, n.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1">
                  <FiTrash2 className="text-sm" />
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
