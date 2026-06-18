import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiZap, FiTrash2, FiMessageCircle, FiHelpCircle, FiBookOpen, FiHeart, FiUsers, FiChevronLeft, FiChevronDown, FiPlus, FiClock } from 'react-icons/fi';
import { useAgentChat, QUICK_QUESTIONS, renderMarkdown, type ChatMessage, WELCOME_MESSAGE } from '@/hooks/useAgentChat';
import { apiFetch } from '@/utils/api';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import toast from 'react-hot-toast';

const PLATFORM_FEATURES = [
  { icon: FiMessageCircle, color: 'from-emerald-400 to-cyan-400', title: '二手交易', desc: '买卖闲置物品，安全便捷的校园二手市场' },
  { icon: FiUsers, color: 'from-blue-400 to-indigo-400', title: '校园广场', desc: '发帖交流、失物招领，连接每一个同学' },
  { icon: FiHelpCircle, color: 'from-amber-400 to-orange-400', title: '校园答疑', desc: '学习互助社区，提问解答分享经验' },
  { icon: FiZap, color: 'from-purple-400 to-pink-400', title: '树洞', desc: '匿名倾诉空间，自由表达真实想法' },
  { icon: FiBookOpen, color: 'from-teal-400 to-green-400', title: '考试资料', desc: '学习资源共享，历年试卷笔记' },
  { icon: FiHeart, color: 'from-rose-400 to-red-400', title: '恋爱交友', desc: '认识志同道合的朋友，真诚交友' },
];

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function AgentPageInner() {
  const {
    messages, setMessages, input, setInput, isLoading,
    aiMode, setAiMode, showReasoning,
    sendMessage, handleClear, toggleReasoning,
    inputRef,
  } = useAgentChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const showEmptyState = messages.length === 1 && messages[0].id === 0;

  // ── 对话历史 ──
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const res = await apiFetch('/api/agent/sessions');
      const data = await res.json();
      if (data.code === 200) setSessions(data.data?.list || []);
      else setSessionsError(data.message || '加载失败');
    } catch {
      setSessionsError('网络异常，请检查网络后重试');
    } finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => {
    if (showHistory) loadSessions();
  }, [showHistory, loadSessions]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/agent/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 200) {
          setSessions((prev) => prev.filter((s: any) => s.id !== sessionId));
          if (activeSessionId === sessionId) setActiveSessionId(null);
          toast.success('已删除');
        } else {
          toast.error(data.message || '删除失败');
        }
      } else {
        toast.error('删除失败，请稍后再试');
      }
    } catch { toast.error('删除失败'); }
  };

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setShowHistory(false);
    setActiveSessionId(sessionId);
    try {
      const res = await apiFetch(`/api/agent/sessions/${sessionId}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.messages) {
        const loaded: ChatMessage[] = [WELCOME_MESSAGE];
        let idCounter = 1;
        for (const m of data.data.messages) {
          loaded.push({
            id: idCounter++,
            text: m.content,
            isUser: m.role === 'user',
            timestamp: new Date(m.createdAt),
          });
        }
        try { localStorage.setItem('qingtao_mascot_chat', JSON.stringify(loaded)); } catch {}
        setMessages(loaded);
        toast.success('已加载对话');
      } else {
        toast.error(data.message || '加载失败');
      }
    } catch { toast.error('加载对话失败'); }
  }, [setMessages]);

  const handleNewChat = useCallback(async () => {
    await handleClear();
    setActiveSessionId(null);
    toast.success('已新建对话');
  }, [handleClear]);

  // Auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
      setShouldAutoScroll(isNearBottom);
      setUserScrolledUp(!isNearBottom && scrollHeight > clientHeight + 200);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolledUp(false);
  };

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) sendMessage(input);
    }
  };

  const hasMessages = messages.length > 1 || (messages.length === 1 && messages[0].id !== 0);

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-gray-950">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={() => window.history.back()}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="返回"
        >
          <FiChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg viewBox="0 0 14 14" width="10" height="10">
            <ellipse cx="7" cy="8.5" rx="4.5" ry="4" fill="white" opacity="0.8" />
            <ellipse cx="5" cy="7" rx="1.8" ry="2" fill="#1e293b" opacity="0.5" />
            <ellipse cx="9" cy="7" rx="1.8" ry="2" fill="#1e293b" opacity="0.5" />
          </svg>
        </div>

        <span className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 flex-1 min-w-0">小轻助手</span>

        {/* History button */}
        <button
          onClick={() => setShowHistory(true)}
          className="relative flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <FiClock className="w-3 h-3" />
          {sessions.length > 0 && (
            <span className="min-w-[16px] h-[16px] rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center px-1">
              {sessions.length}
            </span>
          )}
        </button>

        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
        >
          <FiPlus className="w-3 h-3" />
        </button>
      </div>

      {/* ── Messages area ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        {/* Empty state */}
        {showEmptyState && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto px-4 py-8"
          >
            <div className="text-center mb-8">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block mb-4"
              >
                <svg viewBox="0 0 100 100" width="72" height="72">
                  <defs>
                    <linearGradient id="agentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="50" cy="58" rx="32" ry="28" fill="url(#agentGrad)" />
                  <ellipse cx="50" cy="64" rx="20" ry="16" fill="#a7f3d0" opacity="0.3" />
                  <ellipse cx="40" cy="50" rx="9" ry="11" fill="white" />
                  <circle cx="42" cy="48" r="4.5" fill="#1e293b" />
                  <circle cx="39" cy="46" r="2" fill="white" opacity="0.9" />
                  <ellipse cx="60" cy="50" rx="9" ry="11" fill="white" />
                  <circle cx="62" cy="48" r="4.5" fill="#1e293b" />
                  <circle cx="59" cy="46" r="2" fill="white" opacity="0.9" />
                </svg>
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">你好，我是小轻</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                轻淘校园智能助手，随时为你解答
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {PLATFORM_FEATURES.map((feature, i) => (
                <motion.button
                  key={feature.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => sendMessage(`${feature.title}有什么功能？`)}
                  className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-left hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100">{feature.title}</h4>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{feature.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
          {messages.filter(m => m.id !== 0).map((msg) => (
            <motion.div
              key={msg.id}
              initial={msg.isUser ? { opacity: 0, x: 12 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!msg.isUser && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                  <svg viewBox="0 0 14 14" width="10" height="10">
                    <ellipse cx="7" cy="8.5" rx="4.5" ry="4" fill="white" opacity="0.8" />
                    <ellipse cx="5" cy="7" rx="1.8" ry="2" fill="#1e293b" opacity="0.5" />
                    <ellipse cx="9" cy="7" rx="1.8" ry="2" fill="#1e293b" opacity="0.5" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] md:max-w-[70%] ${msg.isUser ? 'order-1' : ''}`}>
                {/* Reasoning toggle */}
                {msg.reasoning && (
                  <div className="mb-1">
                    <button
                      onClick={() => toggleReasoning(msg.id)}
                      className="flex items-center gap-1 text-[11px] text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                    >
                      <span>🧠</span>
                      {showReasoning[msg.id] ? '收起思考' : '查看思考'}
                    </button>
                    <AnimatePresence>
                      {showReasoning[msg.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 px-3 py-2 bg-purple-50/80 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/30 text-xs text-purple-700/80 dark:text-purple-300/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {msg.reasoning}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.isUser
                      ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white rounded-2xl rounded-br-md shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md'
                  }`}
                >
                  {renderMarkdown(msg.text)}
                  {/* Typing dots */}
                  {msg.isStreaming && !msg.text && (
                    <div className="flex gap-1 py-1">
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-gray-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  )}
                  {msg.isStreaming && msg.text && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-1.5 h-4 bg-emerald-500 rounded-full ml-0.5 align-middle"
                    />
                  )}
                </div>

                {/* Timestamp */}
                <p className={`text-[10px] text-gray-400 dark:text-gray-600 mt-1 ${msg.isUser ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {userScrolledUp && hasMessages && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-[140px] right-4 w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center z-10 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiChevronDown className="w-4 h-4 text-gray-500" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── History sidebar (right slide) ── */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[300px] sm:w-[360px] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col shadow-2xl"
            >
              {/* History header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">对话历史</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {sessions.length > 0 ? `${sessions.length} 个对话` : '暂无历史对话'}
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-16">
                    <motion.div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  </div>
                ) : sessionsError ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                      <FiMessageCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-sm text-red-500 dark:text-red-400 mb-3">{sessionsError}</p>
                    <button onClick={loadSessions} className="px-4 py-2 text-xs font-medium text-white bg-emerald-500 rounded-full hover:bg-emerald-600 transition-colors">
                      点击重试
                    </button>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mx-auto mb-3">
                      <FiMessageCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">还没有对话记录</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">开始和AI助手对话吧</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-1">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => loadSessionMessages(session.id)}
                        className={`group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                          activeSessionId === session.id
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900 border border-transparent'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-100 to-emerald-100 dark:from-cyan-900/30 dark:to-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FiMessageCircle className={`w-3.5 h-3.5 ${activeSessionId === session.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                            {session.firstQuery || '新对话'}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                            {session.messageCount} 条消息 · {new Date(session.lastActive).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                          title="删除"
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History footer */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { handleNewChat(); setShowHistory(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  新建对话
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Quick questions ── */}
      {showEmptyState && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5 max-w-2xl mx-auto">
            {QUICK_QUESTIONS.map((q, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage(q.label)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
              >
                <span>{q.icon}</span>
                <span>{q.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Mode toggle — subtle chips */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <button
              onClick={() => setAiMode('quick')}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                aiMode === 'quick'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
              }`}
            >
              <FiZap className="w-3 h-3" /> 快捷
            </button>
            <button
              onClick={() => setAiMode('thinking')}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                aiMode === 'thinking'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
              }`}
            >
              <span className="text-[10px]">🧠</span> 思考
            </button>
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiMode === 'thinking' ? '开启深度思考，问点有深度的问题...' : '输入你的问题...'}
              maxLength={2000}
              disabled={isLoading}
              aria-label="输入消息"
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-emerald-400/50 dark:focus:ring-emerald-500/50 transition-all disabled:opacity-50"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              aria-label="发送消息"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-sm hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-all flex-shrink-0"
            >
              {isLoading ? (
                <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  return (
    <ErrorBoundary>
      <AgentPageInner />
    </ErrorBoundary>
  );
}
