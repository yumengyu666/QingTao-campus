import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import type { DatingProfile, DatingPost, DatingRequest, DailyMatch } from '@/types/dating';
import { FiPlus, FiUserPlus, FiEdit2, FiSend, FiMail, FiTrash2, FiUsers, FiMessageCircle, FiStar, FiFlag } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function DatingSquarePage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const token = useAuthStore((s) => s.token);
  const [posts, setPosts] = useState<DatingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [editPost, setEditPost] = useState<DatingPost | null>(null);
  const [showFollowing, setShowFollowing] = useState(false);
  const [following, setFollowing] = useState<DatingProfile[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');

  // Following set (by real userId) & request state
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [pendingSentIds, setPendingSentIds] = useState<Set<number>>(new Set());

  // Daily Match
  const [dailyMatch, setDailyMatch] = useState<DailyMatch | null>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch('/api/dating/profile').then(r => r.json()),
      apiFetch('/api/dating/posts').then(r => r.json()),
      apiFetch('/api/dating/requests').then(r => r.json()),
      apiFetch('/api/dating/daily-match').then(r => r.json()),
    ]).then(([pJson, postsJson, reqJson, dmJson]) => {
      if (pJson.code === 200) setProfile(pJson.data);
      if (postsJson.code === 200) setPosts(postsJson.data.list || []);
      if (reqJson.code === 200) {
        const sent = reqJson.data.sent || [];
        const pendingSet = new Set<number>(
          sent.filter((r: DatingRequest) => r.status === 'pending').map((r: DatingRequest) => r.receiver?.userId ?? 0)
        );
        setPendingSentIds(pendingSet);
      }
      if (dmJson.code === 200) setDailyMatch(dmJson.data);
    }).catch(() => toast.error('加载失败，请检查网络后重试')).finally(() => setLoading(false));
  }, [token]);

  // Fetch following list on profile loaded
  useEffect(() => {
    if (!profile || !token) return;
    loadFollowing();
  }, [profile, token]);

  const loadFollowing = async () => {
    try {
      const res = await apiFetch('/api/dating/following');
      const json = await res.json();
      if (json.code === 200) {
        const ids = new Set<number>((json.data || []).map((f: { userId: number }) => f.userId));
        setFollowingIds(ids);
      }
    } catch {}
    // Also update request states
    try {
      const res = await apiFetch('/api/dating/requests');
      const json = await res.json();
      if (json.code === 200) {
        const sent = json.data.sent || [];
        const pending = new Set<number>(
          sent.filter((r: DatingRequest) => r.status === 'pending').map((r: DatingRequest) => r.receiver?.userId ?? 0)
        );
        setPendingSentIds(pending);
      }
    } catch { /* 请求状态更新失败不影响页面使用 */ }
  };

  const handleFollow = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (!profile) { toast('请先创建匿名身份', { icon: '💝' }); return; }
    try {
      const res = await apiFetch(`/api/dating/${userId}/follow`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        setFollowingIds(prev => new Set(prev).add(userId));
        toast.success('已关注，可查看TA全部帖子');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleSendRequest = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/dating/${userId}/request`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 201) {
        setPendingSentIds(prev => new Set(prev).add(userId));
        toast.success('恋爱请求已发送');
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const handleReveal = async () => {
    if (!dailyMatch?.matchId) return;
    setRevealing(true);
    try {
      const res = await apiFetch(`/api/dating/daily-match/${dailyMatch.matchId}/reveal`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        setDailyMatch((prev) => prev ? { ...prev, revealed: true, peer: json.data.peer } : prev);
        toast.success(json.message);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    setRevealing(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-[var(--color-bg)] dark:via-[var(--color-bg)] dark:to-[var(--color-bg)] flex flex-col items-center justify-center px-8 text-center">
        <motion.div animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}
          className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-5xl shadow-2xl shadow-pink-300/30 mb-8">
          💝
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">匿名交友</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-gray-500 dark:text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed max-w-xs">
          灵魂比外貌更重要<br/>
          关注 → 看清头像 • 互关 → 看清帖子<br/>
          恋爱请求 → 交换联系方式
        </motion.p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} onClick={async () => {
          try {
            const res = await apiFetch('/api/dating/profile', { method: 'POST', body: JSON.stringify({}) });
            const json = await res.json();
            if (json.code === 200 || json.code === 201) { setProfile(json.data); toast.success('匿名身份已创建！'); }
          } catch { toast.error('创建失败'); }
        }}
          className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-semibold text-lg shadow-2xl shadow-pink-300/40 hover:shadow-pink-400/50 transition-all">
          创建匿名身份
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-[var(--color-bg)] dark:via-[var(--color-bg)] dark:to-[var(--color-bg)]">
      <Header title="恋爱空间" onBack={() => nav('/')} />
      {/* 关注系统提示 */}
      <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2 border border-amber-200/30 dark:border-amber-500/20">
        <span>💡</span>
        <span>广场关注和恋爱关注是独立的，需要在恋爱区重新关注</span>
      </div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        onClick={() => nav('/dating/profile')}
        className="mx-4 mt-4 bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-xl rounded-3xl p-4 flex items-center gap-3 shadow-xl shadow-pink-100/30 dark:shadow-none border border-white/50 dark:border-[var(--color-border)]/30 cursor-pointer hover:shadow-2xl transition-all active:scale-[0.98] group">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
          {profile.customAvatar ? <img src={profile.customAvatar} className="w-full h-full object-cover" alt="" /> : profile.nickname?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{profile.nickname}</p>
          <p className="text-xs text-gray-400 mt-0.5">{profile.gender === 'male' ? '♂' : profile.gender === 'female' ? '♀' : '👤'} {profile.bio || '点击编辑个性签名'}</p>
        </div>
        <FiEdit2 className="text-gray-300 group-hover:text-pink-400 transition-colors" />
      </motion.div>

      {/* Daily Match — 今日缘分 */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="mx-4 mt-3 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/10 dark:to-orange-900/20 backdrop-blur-xl rounded-3xl p-5 shadow-lg shadow-amber-100/30 dark:shadow-none border border-amber-200/30 dark:border-amber-500/20">
        <div className="flex items-center gap-2 mb-3">
          <FiStar className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">今日缘分</span>
          <span className="text-[10px] text-amber-400 ml-auto">每日一友</span>
        </div>
        {dailyMatch?.matched ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                {dailyMatch.peer?.nickname?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-gray-800 dark:text-[var(--color-text)]">{dailyMatch.peer?.nickname}</p>
                {dailyMatch.peer?.bio && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{dailyMatch.peer.bio}</p>}
                {dailyMatch.revealed ? (
                  <div className="mt-2 space-y-0.5">
                    {dailyMatch.peer?.contactWechat && <p className="text-xs text-green-600 dark:text-green-400">微信: {dailyMatch.peer.contactWechat}</p>}
                    {dailyMatch.peer?.contactQq && <p className="text-xs text-green-600 dark:text-green-400">QQ: {dailyMatch.peer.contactQq}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-amber-500 mt-1">💛 缘分让你们今天相遇</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => nav(`/dating/chat/${dailyMatch.peer?.userId}`)}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-amber-300/30 hover:shadow-xl transition-all">
                💬 {dailyMatch.revealed ? '继续聊天' : '打个招呼'}
              </motion.button>
              {!dailyMatch.revealed && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleReveal} disabled={revealing}
                  className="flex-1 py-2.5 bg-white dark:bg-[var(--color-card)] text-pink-500 border border-pink-200 dark:border-pink-500/20 rounded-2xl text-sm font-semibold hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                  {revealing ? '...' : '💌 想认识你'}
                </motion.button>
              )}
            </div>
          </>
        ) : dailyMatch?.reason === 'in_relationship' ? (
          <p className="text-sm text-pink-600 dark:text-pink-400 text-center py-2">
            💕 累计恋爱 {dailyMatch.relationshipDays || 1} 天
          </p>
        ) : dailyMatch?.reason === 'no_candidates' ? (
          <p className="text-sm text-gray-400 text-center py-2">暂无可匹配的用户，邀请朋友加入吧</p>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">缘分尚未到来，明天再来看看吧</p>
        )}
      </motion.div>

      {/* Requests entry */}
      <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowRequests(true)}
        className="mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-[var(--color-card)]/60 backdrop-blur rounded-2xl text-sm text-pink-500 font-medium hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all border border-pink-200/30 dark:border-pink-500/20">
        <FiMail className="text-base" />
        恋爱请求
      </motion.button>

      {/* Quick actions row */}
      <div className="mx-4 mt-2 flex gap-2">
        <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          onClick={async () => {
            const res = await apiFetch('/api/dating/following');
            const json = await res.json();
            if (json.code === 200) { setFollowing(json.data || []); setShowFollowing(true); }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/60 dark:bg-[var(--color-card)]/60 backdrop-blur rounded-2xl text-sm text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all border border-gray-200/30 dark:border-[var(--color-border)]/30">
          <FiUsers className="text-sm" /> 我的关注
        </motion.button>
        <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => nav('/dating/messages')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/60 dark:bg-[var(--color-card)]/60 backdrop-blur rounded-2xl text-sm text-pink-500 font-medium hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all border border-pink-200/30 dark:border-pink-500/20">
          <FiMessageCircle className="text-sm" /> 私信
        </motion.button>
      </div>

      {/* Posts Feed */}
      <div className="px-4 mt-2">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[var(--color-border)]/30 pb-2">
          <button onClick={() => setFeedFilter('all')}
            className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${feedFilter === 'all' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'text-gray-400'}`}>全部动态</button>
          {followingIds.size > 0 && (
            <button onClick={() => setFeedFilter('following')}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${feedFilter === 'following' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'text-gray-400'}`}>关注动态</button>
          )}
        </div>
      </div>
      <div className="px-4 mt-4 pb-24">
        {loading ? (
          <div className="space-y-4 mt-2">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/80 dark:bg-[var(--color-card)]/80 rounded-3xl p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[var(--color-card-hover)]" /><div className="space-y-1.5"><div className="h-3 w-20 bg-gray-200 dark:bg-[var(--color-card-hover)] rounded" /><div className="h-2 w-12 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded" /></div></div>
                <div className="space-y-2"><div className="h-4 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded w-full" /><div className="h-4 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-5xl mb-4">💝</motion.div>
            <p className="text-sm font-medium">广场空空的</p>
            <p className="text-xs mt-1.5 max-w-[240px] text-center leading-relaxed">
              发一条动态，让更多人发现你<br />
              关注别人，解锁头像和全部动态<br />
              互关 → 恋爱请求 → 交换联系方式
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {posts.filter((p) => feedFilter === 'all' || followingIds.has(p.userId)).map((p, i) => {
                const authorUserId = p.author?.userId;
                const isFollowing = followingIds.has(authorUserId);
                const hasPendingRequest = pendingSentIds.has(authorUserId);
                const authorInRelationship = p.authorInRelationship === true;

                return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all border border-white/50 dark:border-[var(--color-border)]/30">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow">
                      {p.author?.nickname?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{p.author?.nickname}</p>
                      <p className="text-[11px] text-gray-400">{formatTime(p.createdAt)}</p>
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      const res = await apiFetch('/api/reports', { method: 'POST',
                        body: JSON.stringify({ targetType: 'post', targetId: p.id, reason: '违规内容' }) });
                      const json = await res.json();
                      if (json.code === 201) toast.success('已举报');
                      else toast.error(json.message || '举报失败');
                    }} className="ml-auto p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                      <FiFlag className="text-xs" />
                    </button>
                      {authorInRelationship ? (
                        <span className="text-xs px-3 py-2 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-400 border border-pink-200/30 dark:border-pink-500/20">
                          💕 恋爱中
                        </span>
                      ) : (
                        <>
                          {isFollowing && !hasPendingRequest && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleSendRequest(e, authorUserId)}
                              className="flex items-center gap-1 text-xs px-3 py-2 rounded-full bg-gradient-to-r from-amber-400/10 to-orange-400/10 dark:from-amber-400/20 dark:to-orange-400/20 text-amber-600 dark:text-amber-400 font-medium hover:from-amber-400/20 hover:to-orange-400/20 transition-all border border-amber-300/30 dark:border-amber-500/20">
                              <FiSend className="text-[10px]" /> 恋爱请求
                            </motion.button>
                          )}
                          {hasPendingRequest && (
                            <span className="text-xs px-3 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 border border-amber-200/30 dark:border-amber-500/20">
                              等待回应
                            </span>
                          )}
                        </>
                      )}
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleFollow(e, authorUserId)}
                        className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-full font-medium transition-all border ${
                          isFollowing
                            ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-400 border-pink-200/30 dark:border-pink-500/20'
                            : 'bg-gradient-to-r from-pink-400/10 to-rose-400/10 dark:from-pink-400/20 dark:to-rose-400/20 text-pink-500 hover:from-pink-400/20 hover:to-rose-400/20 border-pink-200/30 dark:border-pink-500/20'
                        }`}>
                        <FiUserPlus className="text-xs" /> {isFollowing ? '已关注' : '关注'}
                      </motion.button>
                    </div>
                  <p className="text-sm text-gray-700 dark:text-[var(--color-text)] leading-relaxed">{p.content}</p>
                  {p.images?.length > 0 && (
                    <div className="mt-3 grid gap-2 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: `repeat(${Math.min(p.images.length, 3)}, 1fr)` }}>
                      {p.images.slice(0, 3).map((img: string, i: number) => (
                        <motion.img key={i} whileHover={{ scale: 1.03 }} src={img} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75"><rect fill="%23f0f0f0" width="100" height="75"/><text x="50" y="42" text-anchor="middle" fill="%23ccc" font-size="12">图片加载失败</text></svg>'; }} />
                      ))}
                    </div>
                  )}
                  {/* Owner actions */}
                  {profile && p.author?.userId === profile.userId && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]/30">
                      <button onClick={(e) => { e.stopPropagation(); setEditPost(p); }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500 hover:text-indigo-500 transition-colors">
                        <FiEdit2 className="text-[10px]" /> 编辑
                      </button>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm('确定删除这条帖子吗？')) return;
                        try {
                          const res = await apiFetch(`/api/dating/posts/${p.id}`, { method: 'DELETE' });
                          const json = await res.json();
                          if (json.code === 200) {
                            toast.success('已删除');
                            setPosts(prev => prev.filter(x => x.id !== p.id));
                          } else toast.error(json.message);
                        } catch { toast.error('网络错误'); }
                      }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors">
                        <FiTrash2 className="text-[10px]" /> 删除
                      </button>
                    </div>
                  )}
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Publish FAB */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl shadow-2xl shadow-pink-300/50 flex items-center justify-center text-2xl z-30">
        <FiPlus />
      </motion.button>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreated={() => {
        setShowCreate(false);
        apiFetch('/api/dating/posts').then(r => r.json()).then(json => { if (json.code === 200) setPosts(json.data.list || []); });
      }} />}

      {showRequests && <RequestsModal onClose={() => { setShowRequests(false); loadFollowing(); }} />}
      {editPost && <EditPostModal post={editPost} onClose={() => setEditPost(null)} onUpdated={() => { setEditPost(null); apiFetch('/api/dating/posts').then(r => r.json()).then(json => { if (json.code === 200) setPosts(json.data.list || []); }); }} />}
      {showFollowing && <FollowingModal following={following} onClose={() => setShowFollowing(false)} />}
    </div>
  );
}

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('images', file);
    try {
      const res = await apiFetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200 && json.data?.urls?.[0]) {
        setImages(prev => [...prev, json.data.urls[0].url]);
      }
    } catch { toast.error('上传失败'); }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">分享心情</h3>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="此刻想说什么..."
          maxLength={500} rows={4}
          className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-pink-400/50 resize-none transition-all" />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400">{content.length}/500</p>
          <label className="text-xs text-pink-500 cursor-pointer hover:text-pink-600 transition-colors">
            📷 {uploading ? '上传中...' : '添加图片'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload} />
          </label>
        </div>
        {images.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {images.map((img, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={img} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">取消</button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
            if (!content.trim()) { toast.error('请输入内容'); return; }
            setSubmitting(true);
            try {
              const res = await apiFetch('/api/dating/posts', { method: 'POST', body: JSON.stringify({ content: content.trim(), images }) });
              const json = await res.json();
              if (json.code === 200 || json.code === 201) { toast.success('发布成功'); onCreated(); }
              else toast.error(json.message);
            } catch { toast.error('网络错误'); }
            setSubmitting(false);
          }} disabled={submitting || !content.trim()}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold disabled:opacity-40 shadow-lg shadow-pink-200/30">
            {submitting ? '...' : '发布'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RequestsModal({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<any>({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/dating/requests')
      .then(r => r.json())
      .then(json => { if (json.code === 200) setRequests(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      const res = await apiFetch(`/api/dating/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success(json.message);
        // Refresh
        const rRes = await apiFetch('/api/dating/requests');
        const rJson = await rRes.json();
        if (rJson.code === 200) setRequests(rJson.data);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
  };

  const formatStatus = (s: string) => {
    if (s === 'pending') return { text: '待处理', color: 'text-amber-500' };
    if (s === 'accepted') return { text: '已接受', color: 'text-green-500' };
    if (s === 'rejected') return { text: '已拒绝', color: 'text-red-400' };
    return { text: s, color: 'text-gray-400' };
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-5">恋爱请求</h3>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-[var(--color-card-hover)] rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Received */}
            <p className="text-xs font-semibold text-gray-400 mb-2">收到的请求</p>
            {requests.received.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">暂无</p>
            ) : (
              <div className="space-y-2 mb-4">
                {requests.received.map((r: DatingRequest) => {
                  const st = formatStatus(r.status);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[var(--color-card-hover)]/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">{r.sender.nickname?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.sender.nickname}</p>
                        <p className={`text-xs ${st.color}`}>{st.text}</p>
                        {r.status === 'accepted' && (r.sender.contactWechat || r.sender.contactQq) && (
                          <div className="mt-1 text-xs text-gray-400">
                            {r.sender.contactWechat && <p>微信: {r.sender.contactWechat}</p>}
                            {r.sender.contactQq && <p>QQ: {r.sender.contactQq}</p>}
                          </div>
                        )}
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAction(r.id, 'accepted')}
                            className="px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors">接受</button>
                          <button onClick={() => handleAction(r.id, 'rejected')}
                            className="px-3 py-1.5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-[var(--color-text-secondary)] text-xs font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">拒绝</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sent */}
            <p className="text-xs font-semibold text-gray-400 mb-2">发出的请求</p>
            {requests.sent.length === 0 ? (
              <p className="text-sm text-gray-400">暂无</p>
            ) : (
              <div className="space-y-2">
                {requests.sent.map((r: DatingRequest) => {
                  const st = formatStatus(r.status);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[var(--color-card-hover)]/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">{r.receiver.nickname?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.receiver.nickname}</p>
                        <p className={`text-xs ${st.color}`}>{st.text}</p>
                        {r.status === 'accepted' && (r.receiver.contactWechat || r.receiver.contactQq) && (
                          <div className="mt-1 text-xs text-gray-400">
                            {r.receiver.contactWechat && <p>微信: {r.receiver.contactWechat}</p>}
                            {r.receiver.contactQq && <p>QQ: {r.receiver.contactQq}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <button onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl border border-gray-200 dark:border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          关闭
        </button>
      </motion.div>
    </motion.div>
  );
}

function EditPostModal({ post, onClose, onUpdated }: { post: DatingPost; onClose: () => void; onUpdated: () => void }) {
  const [content, setContent] = useState(post.content || '');
  const [images, setImages] = useState<string[]>(() => {
    try { return typeof post.images === 'string' ? JSON.parse(post.images) : (post.images || []); }
    catch { return []; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('images', file);
    try {
      const res = await apiFetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200 && json.data?.urls?.[0]) {
        setImages(prev => [...prev, json.data.urls[0].url]);
      }
    } catch { toast.error('上传失败'); }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">编辑帖子</h3>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="此刻想说什么..."
          maxLength={500} rows={4}
          className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-pink-400/50 resize-none transition-all" />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400">{content.length}/500</p>
          <label className="text-xs text-pink-500 cursor-pointer hover:text-pink-600 transition-colors">
            📷 {uploading ? '上传中...' : '添加图片'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload} />
          </label>
        </div>
        {images.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {images.map((img, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={img} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-[var(--color-border)] text-sm font-medium">取消</button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
            if (!content.trim()) { toast.error('请输入内容'); return; }
            setSubmitting(true);
            try {
              const res = await apiFetch(`/api/dating/posts/${post.id}`, { method: 'PUT', body: JSON.stringify({ content: content.trim(), images }) });
              const json = await res.json();
              if (json.code === 200) { toast.success('已更新'); onUpdated(); } else toast.error(json.message);
            } catch { toast.error('网络错误'); }
            setSubmitting(false);
          }} disabled={submitting || !content.trim()}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold disabled:opacity-40 shadow-lg">
            {submitting ? '...' : '保存'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FollowingModal({ following, onClose }: { following: DatingProfile[]; onClose: () => void }) {
  const [breaking, setBreaking] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-5">我的关注</h3>
        {following.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">还没有关注任何人</p>
        ) : (
          <div className="space-y-2">
            {following.map((f) => (
              <div key={f.userId} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[var(--color-card-hover)]/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {f.customAvatar ? <img src={f.customAvatar} className="w-full h-full object-cover" alt="" /> : f.nickname?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{f.nickname || `用户 #${f.userId}`}</p>
                </div>
                <button onClick={async () => {
                  if (!confirm('确定解除恋爱关系？')) return;
                  setBreaking(true);
                  try {
                    const res = await apiFetch(`/api/dating/relationship/${f.userId}`, { method: 'DELETE' });
                    const json = await res.json();
                    if (json.code === 200) { toast.success('已解除'); onClose(); } else toast.error(json.message);
                  } catch { toast.error('网络错误'); }
                  setBreaking(false);
                }}
                  disabled={breaking}
                  className="text-xs px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 transition-colors">
                  解除关系
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-5 py-3 rounded-2xl border border-gray-200 dark:border-[var(--color-border)] text-sm font-medium">关闭</button>
      </motion.div>
    </motion.div>
  );
}
