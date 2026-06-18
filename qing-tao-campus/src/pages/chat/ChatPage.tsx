import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import MessageBubble from '@/components/chat/MessageBubble';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import AttachmentMenu from '@/components/chat/AttachmentMenu';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import CallUI from '@/components/chat/CallUI';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatChatTime } from '@/utils/format';
import type { ChatMessage, ChatSender } from '@/types/chat';
import {
  FiSend, FiSmile, FiArrowLeft, FiChevronDown,
  FiMessageCircle, FiMoreHorizontal, FiPhone, FiVideo,
  FiPlus, FiMic, FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { wsService } from '@/services/websocket';

const QUICK_REPLIES = ['还在吗？', '最低多少？', '在哪里交易？', '今天能看吗？', '好的谢谢'];
const EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🥺', '😭', '😤', '🤔',
  '👍', '👎', '❤️', '🔥', '💯', '✨', '🎉', '💪', '🙏', '👀',
  '💀', '🤡', '🐶', '🌸', '🍕', '🎵', '📚', '💻', '⚽', '🌙',
];

function shouldShowTime(msgs: ChatMessage[], i: number): boolean {
  if (i === 0) return true;
  const curr = new Date(msgs[i].createdAt).getTime();
  const prev = new Date(msgs[i - 1].createdAt).getTime();
  return (curr - prev) > 5 * 60 * 1000;
}

const POLL_INTERVAL = 3000;

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [callRecords, setCallRecords] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [peer, setPeer] = useState<ChatSender | null>(null);
  const [sending, setSending] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number; msg: ChatMessage | null }>({
    show: false, x: 0, y: 0, msg: null,
  });

  // Reply state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Long press timer
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastMsgIdRef = useRef<number>(0);
  const [keyboardH, setKeyboardH] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileMsgInputRef = useRef<HTMLInputElement>(null);

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
      apiFetch(`/api/calls/history?pageSize=20`).then(r => r.json()),
    ])
      .then(([userJson, msgJson, callJson]) => {
        if (userJson.code === 200) {
          setPeer(userJson.data);
          const iFollowThem = userJson.data?.isFollowing;
          if (iFollowThem) {
            apiFetch(`/api/users/${userId}/followers`).then(r => r.json()).then(j => {
              if (j.code === 200) {
                const followers = j.data?.list || [];
                const theyFollowMe = followers.some((f: Record<string, unknown>) => f.id === currentUser?.id);
                setIsMutualFollow(theyFollowMe);
              }
            }).catch(() => { /* 关注状态加载失败不影响聊天功能 */ });
          }
        }
        if (msgJson.code === 200) {
          const list = msgJson.data.list || [];
          setMessages(list);
          if (list.length > 0) lastMsgIdRef.current = list[0].id;
        }
        if (callJson.code === 200) {
          const myId = currentUser?.id;
          const peerId = parseInt(userId || '0');
          // 只保留与当前聊天对象的通话
          setCallRecords((callJson.data?.list || []).filter((c: Record<string, unknown>) =>
            (c.callerId === myId && c.calleeId === peerId) ||
            (c.calleeId === myId && c.callerId === peerId)
          ));
        }
      })
      .catch(() => toast.error('加载消息失败，请检查网络后重试'))
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
            // Mark delivered
            apiFetch(`/api/messages/${latest.id}/delivered`, { method: 'PATCH' }).catch(() => {});
          }
        }
      } catch {}
    };
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current!);
  }, [userId, token, currentUser?.id, scrolledUp]);

  // Poll peer typing
  useEffect(() => {
    if (!userId || !token) return;
    const pollTyping = async () => {
      try {
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

  // Typing notification
  const lastTypingRef = useRef(0);
  const notifyTyping = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 1500) {
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

  // === Send message ===
  const sendMessage = async (content: string, type = 'text', extra?: any) => {
    if (!content?.trim() && type === 'text') return;
    if (sending) return;
    setSending(true);

    const tempId = -Date.now();
    const tempMsg: any = {
      id: tempId, senderId: currentUser?.id, content: content?.trim() || '', type,
      createdAt: new Date().toISOString(), _temp: true,
    };

    // Attach extra data
    if (extra) Object.assign(tempMsg, extra);
    if (replyTo) {
      tempMsg.replyToId = replyTo.id;
      tempMsg.replyTo = replyTo;
    }

    setMessages(prev => [tempMsg, ...prev]);
    setText('');
    setShowEmoji(false);
    setShowAttachment(false);
    setReplyTo(null);
    setScrolledUp(false);

    try {
      const body: any = { content: content?.trim() || '[语音]', type };
      if (replyTo) body.replyToId = replyTo.id;
      if (extra?.voiceUrl) { body.content = ''; body.voiceUrl = extra.voiceUrl; body.voiceDuration = extra.voiceDuration; }
      if (extra?.fileUrl) { body.fileUrl = extra.fileUrl; body.fileName = extra.fileName; body.fileSize = extra.fileSize; body.content = `[文件]${extra.fileName}`; }
      if (extra?.locationName) { body.latitude = extra.latitude; body.longitude = extra.longitude; body.locationName = extra.locationName; body.content = `[位置]${extra.locationName}`; }

      const res = await apiFetch(`/api/messages/${userId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 201) {
        const newMsg = json.data;
        lastMsgIdRef.current = newMsg.id;
        setMessages(prev => prev.map(m => m.id === tempId ? { ...newMsg, replyTo } : m));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        inputRef.current?.focus();
      } else {
        toast.error(json.message || '发送失败');
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true, _temp: false } : m));
        setReplyTo(null);
      }
    } catch {
      toast.error('发送失败，请重试');
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true, _temp: false } : m));
      setReplyTo(null);
    }
    setSending(false);
    stopTyping();
  };

  // === 重试发送失败的消息 (#37) ===
  const handleRetry = async (failedMsg: ChatMessage) => {
    if (sending) return;
    // 移除失败消息，重新发送
    setMessages(prev => prev.filter(m => m.id !== failedMsg.id));
    setText(failedMsg.content || '');
    // 延迟一下让UI更新
    setTimeout(() => {
      sendMessage(failedMsg.content, failedMsg.type || 'text');
    }, 50);
  };


  // === Image upload ===
  const uploadAndSend = async (file: File, msgType = 'image') => {
    if (file.size > (msgType === 'image' ? 5 : 20) * 1024 * 1024) {
      toast.error(`${msgType === 'image' ? '图片不能超过5MB' : '文件不能超过20MB'}`);
      return;
    }
    const fd = new FormData();
    fd.append(msgType === 'image' ? 'images' : 'file', file);

    try {
      const endpoint = msgType === 'image' ? '/api/upload/image' : '/api/upload/file';
      const res = await apiFetch(endpoint, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200) {
        const url = json.data?.urls?.[0]?.url || json.data?.urls?.[0] || json.data?.url;
        if (msgType === 'image') {
          sendMessage(url, 'image');
        } else {
          sendMessage(url, 'file', {
            fileUrl: url,
            fileName: file.name,
            fileSize: file.size,
          });
        }
      } else {
        toast.error(json.message || '上传失败');
      }
    } catch {
      toast.error('上传失败');
    }
  };

  // === Message Actions ===
  const handleLongPress = useCallback((e: React.TouchEvent, msg: any) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setContextMenu({
        show: true,
        x: touchStartRef.current.x,
        y: touchStartRef.current.y,
        msg,
      });
    }, 500);
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleCopy = useCallback((msg: any) => {
    navigator.clipboard.writeText(msg.content).then(() => toast.success('已复制'));
  }, []);

  const handleReply = useCallback((msg: any) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleRecall = useCallback(async (msg: any) => {
    try {
      const res = await apiFetch(`/api/messages/${msg.id}/recall`, { method: 'PATCH' });
      const json = await res.json();
      if (json.code === 200) {
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, recalledAt: new Date().toISOString(), content: '消息已撤回' } : m
        ));
        toast.success('消息已撤回');
      } else {
        toast.error(json.message || '撤回失败');
      }
    } catch {
      toast.error('撤回失败');
    }
  }, []);

  const handleDelete = useCallback(async (msg: any) => {
    if (!confirm('确定删除这条消息吗？')) return;
    try {
      const res = await apiFetch('/api/messages/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: [msg.id] }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }
    } catch {
      toast.error('删除失败');
    }
  }, []);

  const handleForward = useCallback((msg: any) => {
    // Navigate to conversation selector
    toast('请选择转发对象（功能开发中）');
  }, []);

  // === Block user ===
  const handleBlock = async () => {
    setShowMenu(false);
    if (!confirm('确定拉黑该用户吗？拉黑后双方无法互发消息。')) return;
    try {
      const res = await apiFetch(`/api/block/${userId}`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('已拉黑');
        nav('/messages');
      } else toast.error(json.message);
    } catch { toast.error('操作失败'); }
  };

  // === Voice message ===
  const handleVoiceSend = useCallback((voiceUrl: string, duration: number) => {
    sendMessage('[语音]', 'voice', { voiceUrl, voiceDuration: duration });
  }, [sendMessage]);

  const [showCallUI, setShowCallUI] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');

  // 来电由全局 GlobalCallListener 统一处理，ChatPage 只需关心呼出

  // === Call ===
  const startVoiceCall = () => {
    setShowMenu(false);
    if (!isMutualFollow) { toast('互相关注后才能使用通话功能'); return; }
    setCallType('audio');
    setShowCallUI(true);
  };

  const startVideoCall = () => {
    setShowMenu(false);
    if (!isMutualFollow) { toast('互相关注后才能使用通话功能'); return; }
    setCallType('video');
    setShowCallUI(true);
  };

  // 位置分享
  const handleLocation = () => {
    setShowAttachment(false);
    if (!navigator.geolocation) { toast('浏览器不支持定位'); return; }
    toast.loading('获取位置中...', { duration: 800 });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss();
        const { latitude, longitude } = pos.coords;
        const locMsg = JSON.stringify({ lat: latitude, lng: longitude, name: '' });
        // 乐观更新 — 立即显示在界面上
        const tempId = Date.now();
        const tempMsg = { id: tempId, senderId: currentUser?.id, content: locMsg, type: 'location', createdAt: new Date().toISOString(), _temp: true };
        setMessages(prev => [tempMsg, ...prev]);
        wsService.send({ type: 'chat_message', to: parseInt(userId!), content: locMsg, messageType: 'location' });
        apiFetch(`/api/messages/${userId}`, { method: 'POST', body: JSON.stringify({ content: locMsg, type: 'location' }) }).catch(() => {});
      },
      (err) => { toast.dismiss(); toast.error('定位失败'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 名片分享
  const handleContactCard = () => {
    setShowAttachment(false);
    const currentUser = useAuthStore.getState().user;
    const cardMsg = JSON.stringify({ userId: currentUser?.id, nickname: currentUser?.nickname, avatarUrl: currentUser?.avatarUrl });
    // 乐观更新
    const tempId = Date.now();
    const tempMsg = { id: tempId, senderId: currentUser?.id, content: cardMsg, type: 'card', createdAt: new Date().toISOString(), _temp: true };
    setMessages(prev => [tempMsg, ...prev]);
    wsService.send({ type: 'chat_message', to: parseInt(userId!), content: cardMsg, messageType: 'card' });
    apiFetch(`/api/messages/${userId}`, { method: 'POST', body: JSON.stringify({ content: cardMsg, type: 'card' }) }).catch(() => {});
    toast.success('已发送名片');
  };

  // 合并消息和通话记录，按时间排序（必须在所有 early return 之前）
  const displayedMessages = useMemo(() => {
    const msgItems = messages.map((m: any) => ({ ...m, _type: 'message' }));
    // 只显示有意义的通话记录（排除 pending/canceled 等无效记录）
    const meaningfulCalls = callRecords.filter((c: any) =>
      ['completed', 'missed', 'rejected'].includes(c.status)
    );
    const callItems = meaningfulCalls.map((c: any) => ({
      _type: 'call' as const,
      id: `call-${c.id}`,
      callType: c.callType,
      callerId: c.callerId,
      calleeId: c.calleeId,
      status: c.status,
      duration: c.duration,
      createdAt: c.startTime || c.createdAt,
    }));
    const merged = [...msgItems, ...callItems];
    // 按时间升序：旧在上，新在下（微信风格）
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [messages, callRecords]);

  if (loading) return <ChatSkeleton onBack={() => navigate(-1)} />;

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-chat-bg)] fixed inset-0 z-50 md:relative md:z-auto md:-mx-6 md:-my-4 md:h-[calc(100dvh-2rem)] md:rounded-xl md:overflow-hidden"
      onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Header */}
      <div className="flex-shrink-0 bg-[var(--color-chat-bg)] px-3 h-12 flex items-center gap-2 border-b border-black/5 dark:border-white/10 z-10">
        <button onClick={() => nav('/messages')} className="p-1">
          <FiArrowLeft className="text-xl text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2.5" onClick={() => navigate(`/user/${userId}`)}>
          <UserAvatar src={peer?.avatarUrl} nickname={peer?.nickname} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">
                {peer?.nickname || '用户'}
              </span>
              {isMutualFollow && (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium">
                  已互关
                </span>
              )}
            </div>
          </div>
        </div>

        {/* WeChat-style header actions */}
        <button onClick={() => setShowSearch(!showSearch)} className="p-2">
          <FiSearch className="text-lg text-gray-600 dark:text-gray-400" />
        </button>
        <button onClick={startVoiceCall} className={`p-2 transition-colors ${isMutualFollow ? 'text-green-500 hover:text-green-600' : 'text-gray-300 dark:text-gray-600'}`}
          title={isMutualFollow ? '语音通话' : '互关后可语音通话'}>
          <FiPhone className="text-lg" />
        </button>
        <button onClick={startVideoCall} className={`p-2 transition-colors ${isMutualFollow ? 'text-green-500 hover:text-green-600' : 'text-gray-300 dark:text-gray-600'}`}
          title={isMutualFollow ? '视频通话' : '互关后可视频通话'}>
          <FiVideo className="text-lg" />
        </button>
        <button className="p-1" onClick={() => setShowMenu(!showMenu)}>
          <FiMoreHorizontal className="text-xl text-gray-600 dark:text-gray-400" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute top-12 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-black/5 dark:border-white/10 z-20 py-1 min-w-[140px]">
              <button onClick={() => { setShowMenu(false); navigate(`/messages/settings/${userId}`); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                📋 聊天详情
              </button>
              <button onClick={handleBlock}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                🚫 拉黑
              </button>
            </div>
          </>
        )}
      </div>

      {/* Messages — 消息与通话记录合并，按时间排列 */}
      <div ref={chatRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-3 shadow-sm">
              <FiMessageCircle className="text-3xl text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm">开始聊天吧</p>
          </div>
        ) : (
          displayedMessages.map((item: any, i: number) => {
            // 通话记录 — 系统消息风格居中显示
            if (item._type === 'call') {
              const isMissed = item.status === 'missed' && item.callerId !== currentUser?.id;
              const isCaller = item.callerId === currentUser?.id;
              const isActive = ['completed', 'active'].includes(item.status);
              const callTime = item.createdAt;
              let showTimeBefore = i === 0;
              if (i > 0) {
                const prev = displayedMessages[i - 1];
                const gap = new Date(callTime).getTime() - new Date(prev.createdAt).getTime();
                if (gap > 5 * 60 * 1000) showTimeBefore = true;
              }
              return (
                <div key={item.id}>
                  {showTimeBefore && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] text-gray-400 bg-[var(--color-chat-timestamp-bg)] px-2.5 py-0.5 rounded-sm">
                        {formatChatTime(callTime)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-center mb-1">
                    <span className={`text-xs px-3 py-1 rounded-full ${isMissed ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {item.callType === 'video' ? '📹' : '📞'} {isCaller ? '呼出' : '呼入'}
                      {isMissed ? ' · 未接听' : isActive ? ` · ${item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '0:00'}` : ''}
                    </span>
                  </div>
                </div>
              );
            }

            // 普通消息
            const isMine = item.senderId === currentUser?.id;
            const showTime = shouldShowTime(displayedMessages, i);
            const prevItem = i > 0 ? displayedMessages[i - 1] : null;
            const isConsecutive = prevItem && prevItem._type === 'message' && prevItem.senderId === item.senderId &&
              (new Date(item.createdAt).getTime() - new Date(prevItem.createdAt).getTime()) < 60 * 1000;

            return (
              <div key={item.id}>
                {showTime && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-gray-400 bg-[var(--color-chat-timestamp-bg)] px-2.5 py-0.5 rounded-sm">
                      {formatChatTime(item.createdAt)}
                    </span>
                  </div>
                )}

                {item.replyToId && item._replyToContent && (
                  <div className={`text-xs text-gray-500 mb-1 px-2 ${isMine ? 'text-right' : ''}`}>
                    <div className="inline-block bg-gray-200/50 dark:bg-gray-700/50 rounded px-2 py-0.5 max-w-[60%] truncate">
                      {item._replyToContent}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <MessageBubble
                    msg={item}
                    isMine={isMine}
                    isConsecutive={isConsecutive}
                    currentUser={currentUser}
                    peer={peer}
                    onImageClick={setPreviewImage}
                    onContextMenu={(e, m) => {
                      e.preventDefault();
                      setContextMenu({ show: true, x: e.clientX, y: e.clientY, msg: m });
                    }}
                    onTouchStart={handleLongPress}
                    onCardClick={(userId) => navigate(`/user/${userId}`)}
                  />
                  {(item as any)._failed && isMine && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => handleRetry(item)}
                        className="text-xs text-red-500 flex items-center gap-1 hover:text-red-600 transition-colors"
                      >
                        <span className="text-[10px]">⚠</span> 发送失败，点击重发
                      </button>
                    </div>
                  )}
                </div>
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

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-black/5 px-3 py-2 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400">引用 {replyTo.senderId === currentUser?.id ? '自己' : peer?.nickname}</div>
              <div className="text-sm text-gray-700 dark:text-gray-200 truncate">
                {replyTo.type === 'image' ? '[图片]' : replyTo.type === 'voice' ? '[语音]' : (replyTo.content?.slice(0, 30) || '')}
              </div>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
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
                <button key={emoji} onClick={() => { setText(t => t + emoji); inputRef.current?.focus(); }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-125">
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar — WeChat style */}
      <div
        className="flex-shrink-0 bg-[var(--color-chat-input-bg)] px-3 py-2 flex items-center gap-1.5 border-t border-black/5 dark:border-white/5"
        style={{ paddingBottom: keyboardH ? `${keyboardH - 56}px` : undefined }}
      >
        {/* Voice toggle */}
        <button
          onClick={() => setShowVoiceRecorder(true)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <FiMic className="text-lg" />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); notifyTyping(); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) { sendMessage(text); stopTyping(); }
            }
          }}
          onBlur={stopTyping}
          placeholder=""
          maxLength={500}
          className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-gray-800 rounded-md text-[16px] outline-none text-gray-900 dark:text-gray-100"
        />

        {/* Emoji */}
        <button
          onClick={() => { setShowEmoji(!showEmoji); setShowAttachment(false); }}
          className={`p-2 transition-colors ${showEmoji ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <FiSmile className="text-lg" />
        </button>

        {/* Plus button */}
        {text.trim().length === 0 ? (
          <button
            onClick={() => { setShowAttachment(!showAttachment); setShowEmoji(false); }}
            className={`p-2 transition-colors ${showAttachment ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <FiPlus className="text-lg" />
          </button>
        ) : (
          <button
            onClick={() => { sendMessage(text); stopTyping(); }}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-md bg-[var(--color-chat-send-btn)] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-opacity active:scale-95"
          >
            <FiSend className="text-sm -rotate-45" />
          </button>
        )}

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
          if (e.target.files?.[0]) uploadAndSend(e.target.files[0], 'image'); e.target.value = '';
        }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
          if (e.target.files?.[0]) uploadAndSend(e.target.files[0], 'image'); e.target.value = '';
        }} />
        <input ref={fileMsgInputRef} type="file" accept="*/*" className="hidden" onChange={e => {
          if (e.target.files?.[0]) uploadAndSend(e.target.files[0], 'file'); e.target.value = '';
        }} />
      </div>

      {/* Attachment Menu */}
      <AttachmentMenu
        show={showAttachment}
        onClose={() => setShowAttachment(false)}
        onImage={() => fileInputRef.current?.click()}
        onCamera={() => cameraInputRef.current?.click()}
        onFile={() => fileMsgInputRef.current?.click()}
        onLocation={handleLocation}
        onVoiceCall={startVoiceCall}
        onVideoCall={startVideoCall}
        onContactCard={handleContactCard}
      />

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onSend={handleVoiceSend}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Context Menu */}
      <MessageContextMenu
        show={contextMenu.show}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        msg={contextMenu.msg}
        isMine={contextMenu.msg?.senderId === currentUser?.id}
        onClose={() => setContextMenu({ show: false, x: 0, y: 0, msg: null })}
        onCopy={handleCopy}
        onReply={handleReply}
        onRecall={handleRecall}
        onDelete={handleDelete}
        onForward={handleForward}
      />

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

      {/* Call UI */}
      {showCallUI && userId && (
        <CallUI
          callType={callType}
          remoteUserId={parseInt(userId)}
          remoteUser={peer}
          isIncoming={false}
          onEnd={() => setShowCallUI(false)}
        />
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
      <div className="flex-shrink-0 bg-[var(--color-chat-input-bg)] p-3">
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
