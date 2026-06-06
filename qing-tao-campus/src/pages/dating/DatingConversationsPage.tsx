import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiArrowLeft } from 'react-icons/fi';

export default function DatingConversationsPage() {
  const navigate = useNavigate();
  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/dating/conversations')
      .then(r => r.json())
      .then(json => { if (json.code === 200) setConvs(json.data?.list || json.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-dvh flex flex-col bg-[#ededed] dark:bg-[#111] md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)] md:rounded-xl md:overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#ededed] dark:bg-[#1a1a1a] px-4 h-12 flex items-center gap-3 border-b border-black/5 dark:border-white/5">
        <button onClick={() => navigate('/dating')} className="p-1 -ml-1">
          <FiArrowLeft className="text-xl text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">恋爱消息</h1>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.03] dark:border-white/[0.03]">
                <div className="skeleton w-12 h-12 rounded-md flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-28 rounded" />
                  <div className="skeleton h-3 w-48 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : convs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-5xl mb-4">💌</motion.div>
            <p className="text-sm font-medium">暂无恋爱消息</p>
            <p className="text-xs mt-1.5 max-w-[220px] text-center leading-relaxed">
              关注 + 请求 → 对方接受 → 解锁私聊
            </p>
          </motion.div>
        ) : (
          <div>
            {convs.map((c: any) => (
              <motion.div key={c.profileId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/dating/chat/${c.userId}`)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors border-b border-black/[0.03] dark:border-white/[0.03] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 overflow-hidden">
                  {c.customAvatar ? <img src={c.customAvatar} className="w-full h-full object-cover" alt="" /> : c.nickname?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] text-gray-900 dark:text-gray-100 font-medium truncate">{c.nickname}</p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{c.lastTime ? formatTime(c.lastTime) : ''}</span>
                  </div>
                  <p className={`text-[13px] mt-0.5 truncate ${c.unread > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                    {c.isMine && <span className="text-gray-400">你：</span>}
                    {c.lastMessage || '开始聊天吧'}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-[#f43530] text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
