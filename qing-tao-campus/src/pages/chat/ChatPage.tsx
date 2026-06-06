import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatChatTime } from '@/utils/format';
import {
  FiSend, FiImage, FiSmile, FiArrowLeft, FiChevronDown,
  FiMessageCircle, FiMoreHorizontal,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const QUICK_REPLIES = ['还在吗？', '最低多少？', '在哪里交易？', '今天能看吗？', '好的谢谢'];
const EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🥺', '😭', '😤', '🤔',
  '👍', '👎', '❤️', '🔥', '💯', '✨', '🎉', '💪', '🙏', '👀',
  '💀', '🤡', '🐶', '🌸', '🍕', '🎵', '📚', '💻', '⚽', '🌙',
];

const POLL_INTERVAL = 3000;

function shouldShowTime(msgs: any[], i: number): boolean {
  if (i === 0) return true;
  const curr = new Date(msgs[i].createdAt).getTime();
  const prev = new Date(msgs[i - 1].createdAt).getTime();
  return (curr - prev) > 5 * 60 * 1000;
}

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [peer, setPeer] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());
  const [reporting, setReporting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastMsgIdRef = useRef<number>(0);
  const [keyboardH, setKeyboardH] = useState(0);

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
    if (!userId || !token) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/users/${userId}`).then(r => r.json()),
      apiFetch(`/api/messages/${userId}?pageSize=40`).then(r => r.json()),
    ])
      .then(([userJson, msgJson]) => {
        if (userJson.code === 200) setPeer(userJson.data);
        if (msgJson.code === 200) {
          const list = msgJson.data.list || [];
          setMessages(list);
          if (list.length > 0) lastMsgIdRef.current = list[0].id;
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, token]);

  // Poll for new messages
  useEffect(() => {
    if (!userId || !token) return;
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/messages/${userId}?pageSize=1`);
        const json = await res.json();
        if (json.code === 200) {
          const latest = (json.data.list || [])[0];
          if (latest && latest.id > lastMsgIdRef.current && latest.senderId !== currentUser?.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === latest.id)) return prev;
              return [latest, ...prev];
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
  }, [userId, token, currentUser?.id, scrolledUp]);

  // Poll peer typing status (1s — skip if peer just sent a message)
  useEffect(() => {
    if (!userId || !token) return;
    const pollTyping = async () => {
      try {
        // 如果对方刚刚发了消息（5秒内），不显示输入气泡
        const lastPeerMsg = messages.find(m => m.senderId !== currentUser?.id && !m._temp);
        if (lastPeerMsg && Date.now() - new Date(lastPeerMsg.createdAt).getTime() < 5000) {
          setPeerTyping(false);
          return;
        }
        const res = await apiFetch(`/api/messages/${userId}/typing`);
        const json = await res.json();
        if (json.code === 200) setPeerTyping(json.data?.typing || false);
      } catch {}
    };
    pollTyping();
    const timer = setInterval(pollTyping, 1000);
    return () => clearInterval(timer);
  }, [userId, token, messages, currentUser?.id]);

  // Send my typing status while typing — immediate on first keystroke, then every 1.5s
  const lastTypingRef = useRef(0);
  const notifyTyping = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 1500) {
      // Still within heartbeat window, schedule a trailing send
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        apiFetch(`/api/messages/${userId}/typing`, { method: 'POST' }).catch(() => {});
        lastTypingRef.current = Date.now();
      }, 1500);
      return;
    }
    lastTypingRef.current = now;
    apiFetch(`/api/messages/${userId}/typing`, { method: 'POST' }).catch(() => {});
  }, [userId]);

  const stopTyping = useCallback(() => {
    clearInterval(typingTimerRef.current);
    clearTimeout(typingTimerRef.current);
    // Send a final "stopped typing" by letting status naturally expire
  }, []);

  // Auto scroll on new messages
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

  const sendMessage = async (content: string, type = 'text') => {
    if (!content.trim() || sending) return;
    setSending(true);
    const tempId = -Date.now();
    const tempMsg = {
      id: tempId, senderId: currentUser?.id, content: content.trim(), type,
      createdAt: new Date().toISOString(), _temp: true,
    };
    setMessages(prev => [tempMsg, ...prev]);
    setText('');
    setShowEmoji(false);
    setScrolledUp(false);

    try {
      const res = await apiFetch(`/api/messages/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), type }),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
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

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    const fd = new FormData();
    fd.append('images', file);
    try {
      const res = await apiFetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200 && json.data?.urls?.[0]) {
        sendMessage(json.data.urls[0].url, 'image');
      }
    } catch { toast.error('上传失败'); }
    e.target.value = '';
  };

  // Block user
  const handleBlock = async () => {
    setShowMenu(false);
    if (!confirm('确定拉黑该用户吗？拉黑后双方无法互发消息。')) return;
    try {
      const res = await apiFetch(`/api/block/${userId}`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拉黑');
        navigate('/messages');
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  // Report messages
  const startReport = () => {
    setShowMenu(false);
    setIsReporting(true);
    setSelectedMsgIds(new Set());
  };

  const cancelReport = () => {
    setIsReporting(false);
    setSelectedMsgIds(new Set());
  };

  const toggleMsgSelect = (msgId: number) => {
    setSelectedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      return next;
    });
  };

  const submitReport = async () => {
    if (selectedMsgIds.size === 0) { toast.error('请选择要举报的消息'); return; }
    setReporting(true);
    try {
      const res = await apiFetch('/api/reports/messages', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: Number(userId),
          messageIds: Array.from(selectedMsgIds),
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        const { violations, totalViolations, reviewed, details } = json.data;
        // 标记违规消息
        const violationIds = new Set((details || []).filter((d: any) => d.violation).map((d: any) => d.id));
        setMessages(prev => prev.map(m =>
          violationIds.has(m.id) ? { ...m, content: '[违规消息]', _violation: true } : m
        ));
        toast.success(`${reviewed}条已审核，${violations}条违规${totalViolations > 5 ? '，对方已被临时封禁' : ''}`);
      } else toast.error(json.message);
    } catch { toast.error('举报失败'); }
    setReporting(false);
    setIsReporting(false);
    setSelectedMsgIds(new Set());
  };

  if (loading) return <ChatSkeleton onBack={() => navigate(-1)} />;

  const displayedMessages = [...messages].reverse();

  return (
    <div className="h-dvh flex flex-col bg-[#ededed] dark:bg-[#111] fixed inset-0 z-50 md:relative md:z-auto md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)] md:rounded-xl md:overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#ededed] dark:bg-[#1a1a1a] px-4 h-12 flex items-center gap-3 border-b border-black/5 dark:border-white/5 z-10">
        <button onClick={() => navigate('/messages')} className="p-1 -ml-1">
          <FiArrowLeft className="text-xl text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2.5" onClick={() => navigate(`/user/${userId}`)}>
          <UserAvatar src={peer?.avatarUrl} nickname={peer?.nickname} size="sm" />
          <span className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">
            {peer?.nickname || '用户'}
          </span>
        </div>
        <button className="p-1 relative" onClick={() => setShowMenu(v => !v)}>
          <FiMoreHorizontal className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        {/* Dropdown Menu */}
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
          <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            已选 {selectedMsgIds.size} 条消息
          </span>
          <div className="flex items-center gap-2">
            <button onClick={cancelReport} className="px-3 py-1 text-xs rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              取消
            </button>
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
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm">
              <FiMessageCircle className="text-3xl text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm">开始聊天吧</p>
          </div>
        ) : (
          displayedMessages.map((msg, i) => {
            const isMine = msg.senderId === currentUser?.id;
            const showTime = shouldShowTime(displayedMessages, i);
            const prevMsg = i > 0 ? displayedMessages[i - 1] : null;
            const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId &&
              (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 60 * 1000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-gray-400 bg-[#d8d8d8]/70 dark:bg-gray-800/70 px-2.5 py-0.5 rounded-sm">
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
                    <UserAvatar
                      src={isMine ? currentUser?.avatarUrl : peer?.avatarUrl}
                      nickname={isMine ? (currentUser?.nickname || '我') : (peer?.nickname || '?')}
                      size="sm"
                    />
                  )}
                  {msg.type === 'image' ? (
                    <div onClick={() => !isReporting && setPreviewImage(msg.content)} className={`cursor-pointer max-w-[65%] relative ${isReporting ? 'pointer-events-none' : ''}`}>
                      <img src={msg.content} alt="" className="max-w-52 max-h-52 rounded-lg object-cover shadow-sm" loading="lazy" />
                    </div>
                  ) : (
                    <div className={`relative max-w-[70%] px-3 py-2 text-[15px] leading-[22px] break-words ${
                      msg._violation
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-500 rounded-[8px]'
                        : isMine
                          ? 'bg-[#95ec69] text-gray-900 rounded-[8px_2px_8px_8px]'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[2px_8px_8px_8px]'
                    } shadow-[0_1px_2px_rgba(0,0,0,0.06)]`}>
                      {msg.content}
                    </div>
                  )}
                  {/* Read status for my last message */}
                  {isMine && idx === 0 && !msg._temp && (
                    <span className={`self-end text-[10px] mt-0.5 ${msg.isRead ? 'text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} title={msg.isRead && msg.readAt ? `已读 ${new Date(msg.readAt).toLocaleTimeString()}` : '未读'}>
                      {msg.isRead ? '已读' : '未读'}
                    </span>
                  )}
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
              <UserAvatar src={peer?.avatarUrl} nickname={peer?.nickname || '?'} size="sm" />
              <div className="bg-white dark:bg-gray-800 rounded-[2px_8px_8px_8px] px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
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

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {scrolledUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
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
            {QUICK_REPLIES.map(qr => (
              <button key={qr} onClick={() => { sendMessage(qr); setShowQuickReply(false); }}
                className="flex-shrink-0 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 shadow-sm active:scale-95 transition-transform">
                {qr}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-1.5 overflow-hidden flex-shrink-0"
          >
            <div className="grid grid-cols-10 gap-1 bg-white dark:bg-gray-800 rounded-xl p-2.5 shadow-sm">
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => { setText(t => t + emoji); setShowEmoji(false); inputRef.current?.focus(); }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-125">
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="flex-shrink-0 bg-[#f7f7f7] dark:bg-[#1e1e1e] px-3 py-2 flex items-center gap-2 border-t border-black/5 dark:border-white/5" style={{ paddingBottom: keyboardH ? `${keyboardH - 56}px` : undefined }}>
        <button onClick={() => { setShowEmoji(false); setShowQuickReply(v => !v); }}
          className={`p-2 rounded-full transition-colors ${
            showQuickReply ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}>
          <FiMoreHorizontal className="text-lg" />
        </button>

        <button onClick={() => { setShowQuickReply(false); setShowEmoji(v => !v); }}
          className={`p-2 rounded-full transition-colors ${
            showEmoji ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}>
          <FiSmile className="text-lg" />
        </button>

        <input ref={inputRef} value={text}
          onChange={e => { setText(e.target.value); notifyTyping(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(text); stopTyping(); } }}
          onBlur={stopTyping}
          placeholder="说点什么..."
          maxLength={500}
          className="flex-1 min-w-0 px-3.5 py-2 bg-white dark:bg-gray-800 rounded-md text-[16px] outline-none text-gray-900 dark:text-gray-100 placeholder-transparent" />

        <label className="p-2 rounded-full text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
          <FiImage className="text-lg" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>

        <button onClick={() => sendMessage(text)} disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-md bg-[#95ec69] text-gray-700 flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity active:scale-95">
          <FiSend className="text-sm -rotate-45" />
        </button>
      </div>
      {text.length > 0 && (
        <div className="flex-shrink-0 text-right px-3 pb-1">
          <span className={`text-[10px] ${text.length > 450 ? 'text-red-400' : 'text-gray-400'}`}>{text.length}/500</span>
        </div>
      )}

      {/* Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={previewImage} alt="" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-dvh flex flex-col bg-[#ededed] dark:bg-[#111] fixed inset-0 z-30 md:relative md:z-auto md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)]">
      <div className="flex-shrink-0 bg-[#ededed] dark:bg-[#1a1a1a] px-4 h-12 flex items-center gap-3 border-b border-black/5 dark:border-white/5">
        <button onClick={onBack} className="p-1 -ml-1"><FiArrowLeft className="text-xl text-gray-400" /></button>
        <div className="skeleton w-9 h-9 rounded-full" />
        <div className="skeleton h-5 w-28 rounded" />
      </div>
      <div className="flex-1 min-h-0 p-4 space-y-5 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
            <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
            <div className={`skeleton h-10 rounded-[8px_2px_8px_8px] ${i % 2 === 0 ? 'w-44' : 'w-36'}`} />
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 bg-[#f7f7f7] dark:bg-[#1e1e1e] p-3">
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
