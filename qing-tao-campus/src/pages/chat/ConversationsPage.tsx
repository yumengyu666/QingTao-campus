import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import toast from 'react-hot-toast';
import { FiMessageCircle, FiSearch, FiUserPlus, FiX, FiSend, FiZap } from 'react-icons/fi';

export default function ConversationsPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const token = useAuthStore((s) => s.token);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  const fetchConversations = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch('/api/messages/conversations')
      .then(r => r.json())
      .then(json => { if (json.code === 200) setConversations(json.data?.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = conversations.filter(
    c => !search || c.nickname?.includes(search) || c.username?.includes(search),
  );

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-chat-bg)] md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)] md:rounded-xl md:overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-[var(--color-chat-bg)] px-4 pt-2 pb-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">消息</h1>
          <button onClick={() => setShowAddFriend(true)}
            className="p-1.5 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <FiUserPlus className="text-lg text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索"
            className="w-full pl-8 pr-8 py-1.5 bg-white/70 dark:bg-gray-800/70 rounded-md text-[15px] outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 border border-black/5 dark:border-white/5" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
              <FiX className="text-gray-400 text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* 小轻AI助手 — 固定在最顶部 */}
        {!search && (
          <button onClick={() => nav('/agent')}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100/80 hover:to-purple-100/80 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 active:scale-[0.99] transition-all border-b border-black/[0.03] dark:border-white/[0.03] block"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
              <FiZap className="text-white text-xl" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">小轻助手</span>
              </div>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                🤖 AI智能助手，随时解答你的问题
              </p>
            </div>
            <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium">
              在线
            </div>
          </button>
        )}

        {loading ? (
          <div className="px-4 mt-2"><Skeleton.Conversation rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message={search ? '未找到联系人' : '暂无消息'}
            description={search ? '换个关键词试试' : '去首页逛逛，联系卖家开启对话'}
            icon={<div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-1 shadow-sm"><FiMessageCircle className="text-3xl text-gray-300 dark:text-gray-600" /></div>}
            action={!search && (
              <button onClick={() => nav('/')} className="px-5 py-2.5 bg-[var(--color-chat-send-btn)] text-white rounded-md text-sm font-medium active:scale-95 transition-all">
                去逛逛
              </button>
            )}
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AnimatePresence>
              {filtered.map((c, i) => (
                <motion.button key={c.userId}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => nav(`/messages/${c.userId}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors border-b border-black/[0.03] dark:border-white/[0.03]"
                >
                  <UserAvatar src={c.avatarUrl} nickname={c.nickname || c.username} size="lg" badge={c.unread} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] text-gray-900 dark:text-gray-100 truncate">{c.nickname || c.username}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{formatTime(c.lastTime)}</span>
                    </div>
                    <p className={`text-[13px] mt-0.5 truncate flex items-center gap-1 ${c.unread > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                      {c.isMine && (
                        <span className="flex-shrink-0">
                          {c.isRead ? (
                            <span className="text-blue-400 text-[10px]" title={`已读 ${c.readAt ? new Date(c.readAt).toLocaleTimeString() : ''}`}>✓✓</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-[10px]" title="未读">✓</span>
                          )}
                        </span>
                      )}
                      {c.lastType === 'image' ? (
                        <span className="flex items-center gap-1"><span className="text-xs">🖼</span> 图片</span>
                      ) : c.lastMessage || '暂无消息'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} />}
    </div>
  );
}

function AddFriendModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await apiFetch(`/api/search?keyword=${encodeURIComponent(query.trim())}&type=users`);
      const json = await res.json();
      if (json.code === 200) setResults((json.data.list || []).filter((r: any) => r.type === 'user'));
    } catch { toast.error('搜索失败'); }
    setSearching(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">添加朋友</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><FiX className="text-gray-400" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="搜索用户名..."
            className="flex-1 px-4 py-2.5 rounded-md bg-gray-100 dark:bg-gray-700 text-sm outline-none text-gray-900 dark:text-gray-100" />
          <button type="button" onClick={handleSearch} disabled={searching}
            className="px-4 py-2.5 bg-[var(--color-chat-send-btn)] text-white rounded-md text-sm font-medium disabled:opacity-50">{searching ? '...' : '搜索'}</button>
        </div>
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.map((u: any) => (
              <div key={u.id} onClick={() => { nav(`/messages/${u.id}`); onClose(); }}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">{u.nickname?.[0] || u.username?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.nickname || u.username}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                <FiSend className="text-gray-300 text-sm" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">{searching ? '搜索中...' : query ? '未找到用户' : '输入用户名搜索'}</p>
        )}
        <button onClick={onClose} className="w-full mt-4 py-3 rounded-md border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300">关闭</button>
      </motion.div>
    </motion.div>
  );
}
