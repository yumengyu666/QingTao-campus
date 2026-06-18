import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiX, FiZap, FiTrash2 } from 'react-icons/fi';
import { useAgentChat, QUICK_QUESTIONS, renderMarkdown } from '@/hooks/useAgentChat';
import toast from 'react-hot-toast';

interface MascotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MascotChat({ isOpen, onClose }: MascotChatProps) {
  const {
    messages, input, setInput, isLoading,
    aiMode, setAiMode, showReasoning,
    sendMessage, handleClear, toggleReasoning,
    inputRef,
  } = useAgentChat();

  const showQuickQuestions = messages.length === 1 && messages[0].id === 0;

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  const [messagesEndRef] = useState(() => ({ current: null as HTMLDivElement | null }));
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const onClear = async () => {
    await handleClear();
    toast.success('对话已清除');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[70] md:z-[70]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed z-[75] flex flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden
                       md:bottom-6 md:right-6 md:w-[440px] md:h-[620px] md:rounded-2xl md:border md:border-gray-200 md:dark:border-gray-700
                       max-md:inset-0 max-md:w-full max-md:h-full max-md:rounded-none"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/40 dark:to-cyan-950/40 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <svg viewBox="0 0 40 40" width="28" height="28">
                  <defs>
                    <linearGradient id="miniGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="20" cy="24" rx="14" ry="13" fill="url(#miniGrad3)" />
                  <ellipse cx="20" cy="27" rx="9" ry="8" fill="#a7f3d0" opacity="0.6" />
                  <ellipse cx="13" cy="20" rx="5" ry="6" fill="white" />
                  <circle cx="14" cy="19" r="2.5" fill="#1e293b" />
                  <circle cx="12" cy="18" r="1.2" fill="white" />
                  <ellipse cx="27" cy="20" rx="5" ry="6" fill="white" />
                  <circle cx="28" cy="19" r="2.5" fill="#1e293b" />
                  <circle cx="26" cy="18" r="1.2" fill="white" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">小轻助手</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {aiMode === 'thinking' ? '🧠 已启动深度思考' : '⚡ DeepSeek V4 快捷响应'}
                </p>
              </div>
              <button
                onClick={onClear}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="清除对话"
              >
                <FiTrash2 className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              >
                <FiX className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-950">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                  {!msg.isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                      <svg viewBox="0 0 20 20" width="14" height="14">
                        <ellipse cx="10" cy="12" rx="7" ry="6.5" fill="white" opacity="0.9" />
                        <ellipse cx="7" cy="10" rx="2.5" ry="3" fill="#1e293b" opacity="0.6" />
                        <ellipse cx="13" cy="10" rx="2.5" ry="3" fill="#1e293b" opacity="0.6" />
                      </svg>
                    </div>
                  )}
                  <div className="max-w-[82%]">
                    {/* Reasoning section */}
                    {msg.reasoning && (
                      <div className="mb-1.5">
                        <button
                          onClick={() => toggleReasoning(msg.id)}
                          className="flex items-center gap-1.5 text-[10px] text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        >
                          <span className="text-xs">🧠</span>
                          {showReasoning[msg.id] ? '收起思考过程' : '查看思考过程'}
                        </button>
                        <AnimatePresence>
                          {showReasoning[msg.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
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
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.isUser
                          ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {renderMarkdown(msg.text)}
                      {msg.isStreaming && !msg.text && (
                        <div className="flex gap-1.5 py-1">
                          <motion.span className="w-2 h-2 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                          <motion.span className="w-2 h-2 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                          <motion.span className="w-2 h-2 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                        </div>
                      )}
                      {msg.isStreaming && msg.text && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-1.5 h-4 bg-emerald-500 dark:bg-emerald-400 rounded-full ml-0.5 align-middle"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {showQuickQuestions && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <FiZap className="w-3 h-3" /> 快捷提问
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => sendMessage(q.label)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-sm"
                    >
                      <span>{q.icon}</span>
                      <span>{q.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
              {/* Mode toggle */}
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => setAiMode('quick')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    aiMode === 'quick'
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiZap className="w-3 h-3" /> 快捷
                </button>
                <button
                  onClick={() => setAiMode('thinking')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    aiMode === 'thinking'
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xs">🧠</span> 思考
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
                  placeholder={aiMode === 'thinking' ? '开启深度思考，问点深度问题...' : '输入你的问题...'}
                  maxLength={2000}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  <FiSend className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 text-center">
                {aiMode === 'thinking'
                  ? '思考模式会展示推理过程，回复更深入但稍慢'
                  : '默认快捷模式快速响应 · 点击「思考」切换深度推理'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
