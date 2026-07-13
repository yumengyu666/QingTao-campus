import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/utils/api';
import { formatChatTime } from '@/utils/format';
import { FiSend, FiArrowLeft, FiChevronDown, FiMoreHorizontal, FiSmile } from 'react-icons/fi';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 3000;

// 破冰话题 — 帮助开启对话
const ICEBREAKERS = [
  '😊 嗨，今天过得怎么样？',
  '🎓 你是哪个专业的呀？',
  '🍜 学校食堂你最喜欢吃什么？',
  '🎵 最近在听什么歌？',
  '📚 有什么好书推荐吗？',
  '🏀 平时喜欢做什么运动？',
  '🎬 最近看了什么好电影？',
  '☕ 有空一起去图书馆吗？',
];

function shouldShowTime(msgs: any[], i: number): boolean {
  if (i === msgs.length - 1) return true;
  const curr = new Date(msgs[i].createdAt).getTime();
  const next = new Date(msgs[i + 1].createdAt).getTime();
  return (next - curr) > 5 * 60 * 1000;
}

export default function DatingChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peer, setPeer] = useState<any>(null);
  const [myProfileId, setMyProfileId] = useState<number | null>(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [keyboardH, setKeyboardH] = useState(0);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());
  const [reporting, setReporting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastMsgIdRef = useRef<number>(0);

  // Keyboard avoidance
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardH(offset > 60 ? offset : 0);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/dating/messages/${userId}`).then(r => r.json()),
      apiFetch('/api/dating/profile').then(r => r.json()),
    ]).then(([msgJson, profileJson]) => {
      if (msgJson.code === 200) {
        const list = msgJson.data.list || [];
        setMessages(list);
        if (list.length > 0) lastMsgIdRef.current = list[list.length - 1].id;
      }
      if (profileJson.code === 200 && profileJson.data) {
        setMyProfileId(profileJson.data.id);
        apiFetch('/api/dating/requests').then(r => r.json()).then(j => {
          if (j.code === 200) {
            const sent = (j.data.sent || []).find((r: any) => r.receiver?.userId === Number(userId));
            const received = (j.data.received || []).find((r: any) => r.sender?.userId === Number(userId));
            setPeer(sent?.receiver || received?.sender || null);
          }
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  // Poll new messages
  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/dating/messages/${userId}`);
        const json = await res.json();
        if (json.code === 200) {
          const list = json.data.list || [];
          const latest = list[list.length - 1];
          if (latest && latest.id > lastMsgIdRef.current && latest.senderId !== myProfileId) {
            setMessages(prev => {
              if (prev.some(m => m.id === latest.id)) return prev;
              return [...prev, latest];
            });
            lastMsgIdRef.current = latest.id;
            setPeerTyping(false);
            if (!scrolledUp) {
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          }
        }
      } catch {}
    };
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [userId, myProfileId, scrolledUp]);

  // Poll peer typing status (1s — skip if peer just sent a message)
  useEffect(() => {
    if (!userId || userId === 'undefined') return;
    const pollTyping = async () => {
      try {
        const lastPeerMsg = messages.find(m => m.senderId !== myProfileId && !m._temp);
        if (lastPeerMsg && Date.now() - new Date(lastPeerMsg.createdAt).getTime() < 5000) {
          setPeerTyping(false);
          return;
        }
        const res = await apiFetch(`/api/dating/messages/${userId}/typing`);
        const json = await res.json();
        if (json.code === 200) setPeerTyping(json.data?.typing || false);
      } catch {}
    };
    pollTyping();
    const timer = setInterval(pollTyping, 1000);
    return () => clearInterval(timer);
  }, [userId, messages, myProfileId]);

  // Send typing status — immediate, then every 1.5s
  const lastTypingRef = useRef(0);
  const notifyTyping = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 1500) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        apiFetch(`/api/dating/messages/${userId}/typing`, { method: 'POST' }).catch(() => {});
        lastTypingRef.current = Date.now();
      }, 1500);
      return;
    }
    lastTypingRef.current = now;
    apiFetch(`/api/dating/messages/${userId}/typing`, { method: 'POST' }).catch(() => {});
  }, [userId]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimerRef.current);
  }, []);

  // Auto scroll
  useEffect(() => {
    if (!scrolledUp && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages.length, scrolledUp]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 200);
    }
  }, [loading]);

  const handleScroll = useCallback(() => {
    const el = chatRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setScrolledUp(dist > 150);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setScrolledUp(false);
  };

  const handleBlock = async () => {
    setShowMenu(false);
    if (!confirm('确定拉黑该用户吗？拉黑后双方无法互发消息。')) return;
    try {
      const res = await apiFetch(`/api/block/${peer?.userId}`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拉黑');
        nav('/dating/messages');
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  // Report messages
  const startReport = () => { setShowMenu(false); setIsReporting(true); setSelectedMsgIds(new Set()); };
  const cancelReport = () => { setIsReporting(false); setSelectedMsgIds(new Set()); };
  const toggleMsgSelect = (msgId: number) => {
    setSelectedMsgIds(prev => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  };
  const submitReport = async () => {
    if (selectedMsgIds.size === 0) { toast.error('请选择要举报的消息'); return; }
    setReporting(true);
    try {
      const res = await apiFetch('/api/reports/messages', {
        method: 'POST',
        body: JSON.stringify({ reportedUserId: peer?.userId, messageIds: Array.from(selectedMsgIds) }),
      });
      const json = await res.json();
      if (json.code === 200) {
        const violationIds = new Set((json.data?.details || []).filter((d: any) => d.violation).map((d: any) => d.id));
        setMessages(prev => prev.map(m => violationIds.has(m.id) ? { ...m, content: '[违规消息]', _violation: true } : m));
        toast.success(`${json.data?.reviewed || 0}条已审核，${json.data?.violations || 0}条违规`);
      } else toast.error(json.message);
    } catch { toast.error('举报失败'); }
    setReporting(false); setIsReporting(false); setSelectedMsgIds(new Set());
  };

  const handleSend = async (prefill?: string | React.MouseEvent) => {
    const msgToSend = (typeof prefill === 'string' ? prefill : text).trim();
    if (!msgToSend || sending) return;
    setSending(true);
    const tempId = -Date.now();
    const tempMsg = { id: tempId, senderId: myProfileId, content: msgToSend, type: 'text', createdAt: new Date().toISOString(), _temp: true };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    setScrolledUp(false);

    try {
      const res = await apiFetch(`/api/dating/messages/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ content: msgToSend }),
      });
      const json = await res.json();
      if (json.code === 201 || json.code === 200) {
        const newMsg = json.data;
        lastMsgIdRef.current = newMsg.id;
        setMessages(prev => prev.map(m => m.id === tempId ? newMsg : m));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        inputRef.current?.focus();
      } else {
        toast.error(json.message || '发送失败');
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch {
      toast.error('发送失败，请重试');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  const displayedMessages = messages;

  if (loading) return <ChatSkeleton onBack={() => nav('/dating/messages')} />;

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-chat-bg)] fixed inset-0 z-50 md:relative md:z-auto md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)] md:rounded-xl md:overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-[var(--color-chat-bg)] px-4 h-12 flex items-center gap-3 border-b border-black/5 dark:border-white/5 z-10">
        <button onClick={() => nav('/dating/messages')} className="p-1 -ml-1">
          <FiArrowLeft className="text-xl text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-base text-gray-900 dark:text-gray-100">
            {peer?.nickname || '恋爱聊天'}
          </span>
        </div>
        {peer?.userId && (
          <button onClick={() => nav(`/messages/${peer.userId}`)}
            className="text-xs px-2 py-1 rounded-md text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors mr-1">
            普通消息
          </button>
        )}
        <button className="p-1 relative" onClick={() => setShowMenu(v => !v)}>
          <FiMoreHorizontal className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute top-12 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-black/5 dark:border-white/10 z-20 py-1 min-w-[120px]">
              <button onClick={handleBlock} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                🚫 拉黑
              </button>
              <button onClick={startReport} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                ⚠️ 举报消息
              </button>
            </div>
          </>
        )}
      </div>

      {/* Report bar */}
      {isReporting && (
        <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 flex items-center justify-between border-b border-amber-200 dark:border-amber-800">
          <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">已选 {selectedMsgIds.size} 条消息</span>
          <div className="flex items-center gap-2">
            <button onClick={cancelReport} className="px-3 py-1 text-xs rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">取消</button>
            <button onClick={submitReport} disabled={selectedMsgIds.size === 0 || reporting}
              className="px-3 py-1 text-xs rounded-md bg-red-500 text-white font-medium disabled:opacity-40">
              {reporting ? '提交中...' : '提交举报'}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={chatRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm text-3xl">💕</div>
            <p className="text-sm">开始你们的对话吧</p>
          </div>
        ) : (
          displayedMessages.map((msg, i) => {
            const isMine = msg.senderId === myProfileId || msg._temp;
            const showTime = shouldShowTime(displayedMessages, i);
            const prevMsg = i > 0 ? displayedMessages[i - 1] : null;
            const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId &&
              (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 60 * 1000;

            return (
              <div key={msg.id || i}>
                {showTime && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-gray-400 bg-[var(--color-chat-timestamp-bg)] px-2.5 py-0.5 rounded-sm">
                      {formatChatTime(msg.createdAt)}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2 ${isMine ? 'flex-row-reverse' : ''} ${isConsecutive ? 'mt-[2px]' : 'mt-2.5'}`}
                >
                  {isConsecutive ? (
                    <div className="w-9 flex-shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm ${
                      isMine ? 'bg-gradient-to-br from-pink-400 to-rose-500' : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                    }`}>
                      {isMine ? '我' : (peer?.nickname?.[0] || '?')}
                    </div>
                  )}
                  <div className={`relative max-w-[70%] px-3 py-2 text-[15px] leading-[22px] break-words ${
                    msg._violation
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-500 rounded-[8px]'
                      : isMine
                        ? 'bg-[var(--color-chat-bubble-self)] text-gray-900 rounded-[8px_2px_8px_8px]'
                        : 'bg-[var(--color-chat-bubble-other)] text-gray-900 dark:text-gray-100 rounded-[2px_8px_8px_8px]'
                  } shadow-[0_1px_2px_rgba(0,0,0,0.06)]`}>
                    {msg._violation ? '违规消息' : msg.content}
                  </div>
                  {/* Report checkbox — only on peer's messages */}
                  {isReporting && !isMine && !msg._temp && (
                    <button onClick={() => toggleMsgSelect(msg.id)}
                      className={`flex-shrink-0 self-center w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedMsgIds.has(msg.id)
                          ? 'bg-red-500 border-red-500 text-white shadow'
                          : 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                      }`}>
                      {selectedMsgIds.has(msg.id) && <span className="text-[10px] leading-none font-bold">✓</span>}
                    </button>
                  )}
                </motion.div>
              </div>
            );
          })
        )}
        {/* Typing indicator */}
        <AnimatePresence>
          {peerTyping && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex items-start gap-2 mt-2.5">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm">
                {peer?.nickname?.[0] || '?'}
              </div>
              <div className="bg-[var(--color-chat-bubble-other)] rounded-[2px_8px_8px_8px] px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                      className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-0" />
      </div>

      {/* Scroll-to-bottom */}
      <AnimatePresence>
        {scrolledUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            onClick={scrollToBottom}
            className="absolute bottom-[72px] left-1/2 -translate-x-1/2 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center z-10"
          >
            <FiChevronDown className="text-gray-500 text-xs" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Reply Panel */}
      <AnimatePresence>
        {showQuickReply && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-1.5 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0"
          >
            {ICEBREAKERS.map(q => (
              <button key={q} onClick={() => { handleSend(q); setShowQuickReply(false); }}
                className="flex-shrink-0 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 shadow-sm active:scale-95 transition-transform">
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="flex-shrink-0 bg-[var(--color-chat-input-bg)] px-3 py-2 flex items-center gap-2 border-t border-black/5 dark:border-white/5" style={{ paddingBottom: keyboardH ? `${keyboardH - 56}px` : undefined }}>
        <button onClick={() => setShowQuickReply(v => !v)}
          className={`p-2 rounded-full transition-colors ${
            showQuickReply ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}>
          <FiSmile className="text-lg" />
        </button>

        <input ref={inputRef} value={text}
          onChange={e => { setText(e.target.value); notifyTyping(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); stopTyping(); } }}
          onBlur={stopTyping}
          placeholder="说点什么..."
          maxLength={500}
          className="flex-1 min-w-0 px-3.5 py-2 bg-white dark:bg-gray-800 rounded-md text-[16px] outline-none text-gray-900 dark:text-gray-100" />

        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-md bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity active:scale-95">
          <FiSend className="text-sm -rotate-45" />
        </button>
      </div>
      {text.length > 0 && (
        <div className="flex-shrink-0 text-right px-3 pb-1">
          <span className={`text-[10px] ${text.length > 450 ? 'text-red-400' : 'text-gray-400'}`}>{text.length}/500</span>
        </div>
      )}
    </div>
  );
}

function ChatSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-dvh flex flex-col bg-[var(--color-chat-bg)] fixed inset-0 z-30 md:relative md:z-auto md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)]">
      <div className="flex-shrink-0 bg-[var(--color-chat-bg)] px-4 h-12 flex items-center gap-3 border-b border-black/5 dark:border-white/5">
        <button onClick={onBack} className="p-1 -ml-1"><FiArrowLeft className="text-xl text-gray-400" /></button>
        <div className="skeleton w-9 h-9 rounded-full" />
        <div className="skeleton h-5 w-24 rounded" />
      </div>
      <div className="flex-1 min-h-0 p-4 space-y-5 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
            <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
            <div className={`skeleton h-10 rounded-[8px_2px_8px_8px] ${i % 2 === 0 ? 'w-44' : 'w-36'}`} />
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 bg-[var(--color-chat-input-bg)] p-3">
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
