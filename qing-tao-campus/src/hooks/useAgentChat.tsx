import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/utils/storage';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export interface ChatMessage {
  id: number;
  text: string;
  reasoning?: string | null;
  isUser: boolean;
  isStreaming?: boolean;
  timestamp: Date;
}

export const QUICK_QUESTIONS = [
  { icon: '📦', label: '怎么买卖二手？' },
  { icon: '💬', label: '广场有什么功能？' },
  { icon: '❓', label: '校园答疑怎么用？' },
  { icon: '🌳', label: '树洞是什么？' },
  { icon: '📚', label: '怎么找考试资料？' },
  { icon: '💕', label: '恋爱交友怎么玩？' },
  { icon: '🔍', label: '怎么搜索内容？' },
  { icon: '🛡️', label: '如何举报违规？' },
];

export const WELCOME_MESSAGE: ChatMessage = {
  id: 0,
  text: '你好呀！我是小轻，轻淘平台的智能助手 🎓\n\n我可以帮你了解平台的各项功能。\n\n💡 默认快捷模式快速响应，需要深入分析时切换「思考」模式～\n\n直接问我问题，或者点击下面的快捷提问吧！',
  isUser: false,
  timestamp: new Date(),
};

const STORAGE_KEY = 'qingtao_mascot_chat';

/** Validate a single message object has required fields */
function isValidMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== 'object') return false;
  const msg = m as Record<string, unknown>;
  return typeof msg.id === 'number'
    && typeof msg.text === 'string'
    && typeof msg.isUser === 'boolean'
    && typeof msg.timestamp === 'string';
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(isValidMessage);
        if (valid.length > 0) {
          // Convert timestamp strings back to Date objects
          return valid.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
        }
      }
    }
  } catch {
    // Corrupted data — clear it so it doesn't keep crashing
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  return [WELCOME_MESSAGE];
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {}
}

export interface UseAgentChatOptions {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

export function useAgentChat(options?: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'quick' | 'thinking'>('quick');
  const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>({});

  // 用 ref 确保 sendMessage 始终读到最新的 mode 和 loading，避免闭包陈旧问题
  const aiModeRef = useRef(aiMode);
  aiModeRef.current = aiMode;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // 使用 useMemo 惰性初始化 id 计数器
  const initialMsgs = useMemo(() => loadMessages(), []);
  const initIdCounter = useMemo(() => {
    if (initialMsgs.length === 1 && initialMsgs[0].id === 0) return 1;
    return Math.max(...initialMsgs.map(m => m.id)) + 1;
  }, [initialMsgs]);
  const msgIdRef = useRef(initIdCounter);
  const nextId = useCallback(() => ++msgIdRef.current, []);
  const typingRef = useRef<ReturnType<typeof setInterval>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  // Sync to localStorage
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Clean up typing timer and mark unmounted on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearInterval(typingRef.current);
    };
  }, []);

  /** Send message — tries SSE streaming first, falls back to non-streaming */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoadingRef.current) return;

    const currentMode = aiModeRef.current;
    clearInterval(typingRef.current);
    options?.onStreamStart?.();

    const userMsgId = nextId();
    const aiMsgId = nextId();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, text: trimmed, isUser: true, timestamp: new Date() },
      { id: aiMsgId, text: '', reasoning: null, isUser: false, isStreaming: true, timestamp: new Date() },
    ]);
    setInput('');
    setIsLoading(true);

    // ── Try real streaming ──
    let streamOk = false;
    const sseStartTime = Date.now();
    try {
      const token = storage.getToken() || '';
      const abortCtrl = new AbortController();
      const timeoutMs = currentMode === 'thinking' ? 60000 : 30000;
      const timeoutId = setTimeout(() => abortCtrl.abort(), timeoutMs);

      const streamRes = await fetch('/api/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: trimmed, mode: currentMode }),
        signal: abortCtrl.signal,
      });

      clearTimeout(timeoutId);

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let fullReasoning = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!mountedRef.current) { reader.cancel().catch(() => {}); break; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const raw = t.slice(5).trim();
            if (!raw) continue;
            try {
              const p = JSON.parse(raw);
              if (p.type === 'content') {
                fullText += p.content;
                setMessages((prev) => prev.map((m) =>
                  m.id === aiMsgId ? { ...m, text: fullText, isStreaming: true } : m
                ));
              } else if (p.type === 'reasoning') {
                fullReasoning += p.content;
                setMessages((prev) => prev.map((m) =>
                  m.id === aiMsgId ? { ...m, reasoning: fullReasoning, isStreaming: true } : m
                ));
                setShowReasoning((prev) => ({ ...prev, [aiMsgId]: true }));
              } else if (p.type === 'done') {
                setMessages((prev) => prev.map((m) =>
                  m.id === aiMsgId ? { ...m, text: p.content || fullText, reasoning: p.reasoning || fullReasoning || null, isStreaming: false } : m
                ));
              } else if (p.type === 'error') {
                fullText = p.message || 'AI 服务暂时不可用';
                streamOk = true;
                setMessages((prev) => prev.map((m) =>
                  m.id === aiMsgId ? { ...m, text: fullText, isStreaming: false } : m
                ));
              }
            } catch { /* skip */ }
          }
        }
        if (mountedRef.current) {
          setMessages((prev) => prev.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false, text: m.text || '收到啦～' } : m
          ));
        }
        streamOk = true;
      } else {
        // SSE endpoint returned non-ok or no body — fast-fail if within 2s
        const elapsed = Date.now() - sseStartTime;
        if (elapsed < 2000 && mountedRef.current) {
          setMessages((prev) => prev.map((m) =>
            m.id === aiMsgId ? { ...m, text: '连接AI服务失败，请稍后重试', isStreaming: false } : m
          ));
          setIsLoading(false);
          toast.error('连接AI服务失败，请稍后重试');
          options?.onStreamEnd?.();
          return;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Distinguish: was this a quick connection failure or a deliberate timeout?
        const elapsed = Date.now() - sseStartTime;
        if (elapsed < 2000) {
          // SSE endpoint completely unreachable — fast-fail, no fallback
          if (mountedRef.current) {
            setMessages((prev) => prev.map((m) =>
              m.id === aiMsgId ? { ...m, text: '连接AI服务失败，请稍后重试', isStreaming: false } : m
            ));
            setIsLoading(false);
          }
          toast.error('连接AI服务失败，请稍后重试');
          options?.onStreamEnd?.();
          return;
        }
        // Normal timeout — mark as handled so we don't fall back
        setMessages((prev) => prev.map((m) =>
          m.id === aiMsgId ? { ...m, text: '请求超时，请稍后再试 😢', isStreaming: false } : m
        ));
        streamOk = true;
      } else {
        // Non-abort error (network failure, 5xx, etc.) — fast-fail within 2s
        const elapsed = Date.now() - sseStartTime;
        if (elapsed < 2000) {
          if (mountedRef.current) {
            setMessages((prev) => prev.map((m) =>
              m.id === aiMsgId ? { ...m, text: '连接AI服务失败，请稍后重试', isStreaming: false } : m
            ));
            setIsLoading(false);
          }
          toast.error('连接AI服务失败，请稍后重试');
          options?.onStreamEnd?.();
          return;
        }
        // Slower failure — let the non-streaming fallback handle it
      }
    }

    // ── Fallback: non-streaming ──
    if (!streamOk) {
      try {
        const abortCtrl = new AbortController();
        const timeoutMs = currentMode === 'thinking' ? 60000 : 30000;
        const timeoutId = setTimeout(() => abortCtrl.abort(), timeoutMs);

        const res = await apiFetch('/api/agent/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: trimmed, mode: currentMode }),
          signal: abortCtrl.signal,
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.code === 200 && data.data?.reply) {
          const reasoning = data.data?.reasoning || null;
          const fullText = data.data.reply;
          let i = 0;
          const speed = fullText.length > 100 ? 15 : 25;
          clearInterval(typingRef.current);
          typingRef.current = setInterval(() => {
            if (!mountedRef.current) { clearInterval(typingRef.current); return; }
            i++;
            if (i <= fullText.length) {
              setMessages((prev) => prev.map((m) =>
                m.id === aiMsgId ? { ...m, text: fullText.slice(0, i), isStreaming: true } : m
              ));
            } else {
              clearInterval(typingRef.current);
              setMessages((prev) => prev.map((m) =>
                m.id === aiMsgId ? { ...m, text: fullText, reasoning, isStreaming: false } : m
              ));
              if (reasoning) setShowReasoning((prev) => ({ ...prev, [aiMsgId]: true }));
              setIsLoading(false);
            }
          }, speed);
          return; // typing handles setIsLoading
        }

        setMessages((prev) => prev.map((m) =>
          m.id === aiMsgId ? { ...m, text: data.message || '小轻不在线，请稍后再试 😢', isStreaming: false } : m
        ));
      } catch (err: any) {
        const errorMsg = err.name === 'AbortError'
          ? '请求超时，请稍后再试 😢'
          : '网络异常，请检查网络后重试 📡';
        setMessages((prev) => prev.map((m) =>
          m.id === aiMsgId ? { ...m, text: errorMsg, isStreaming: false } : m
        ));
      }
    }

    if (mountedRef.current) {
      setIsLoading(false);
    }
    options?.onStreamEnd?.();
  }, [nextId, options]);

  const handleClear = useCallback(async () => {
    clearInterval(typingRef.current);
    try {
      await apiFetch('/api/agent/chat/clear', { method: 'POST' });
    } catch {
      // Server clear may fail if not authenticated — still clear locally
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setMessages([WELCOME_MESSAGE]);
    setShowReasoning({});
    msgIdRef.current = 1;
  }, []);

  const toggleReasoning = useCallback((msgId: number) => {
    setShowReasoning((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    aiMode,
    setAiMode,
    showReasoning,
    sendMessage,
    handleClear,
    toggleReasoning,
    inputRef,
  };
}

/**
 * Render Markdown-like text into JSX
 * Supports: **bold**, `inline code`, ```code blocks```, > blockquotes, 
 *           1. ordered lists, - unordered lists, [links](url), ### headers
 */
export function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeContent = '';
      } else {
        inCodeBlock = false;
        result.push(
          <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {codeLang && (
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                {codeLang}
              </div>
            )}
            <pre className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre font-mono leading-relaxed">
              {codeContent}
            </pre>
          </div>
        );
        codeContent = '';
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    // Inline processing helper
    const processInline = (text: string): React.ReactNode[] => {
      // Handle inline code
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let partIdx = 0;

      while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        const codeMatch = remaining.match(/`([^`]+)`/);
        const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

        // Find earliest match
        let earliest: { type: string; index: number; length: number; node: React.ReactNode } | null = null;

        if (boldMatch && (!earliest || boldMatch.index! < earliest.index)) {
          earliest = {
            type: 'bold',
            index: boldMatch.index!,
            length: boldMatch[0].length,
            node: <strong key={partIdx++} className="font-semibold text-gray-900 dark:text-gray-100">{boldMatch[1]}</strong>,
          };
        }
        if (codeMatch && (!earliest || codeMatch.index! < earliest.index)) {
          earliest = {
            type: 'code',
            index: codeMatch.index!,
            length: codeMatch[0].length,
            node: <code key={partIdx++} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 rounded text-xs font-mono">{codeMatch[1]}</code>,
          };
        }
        if (linkMatch && (!earliest || linkMatch.index! < earliest.index)) {
          const href = /^(https?:|mailto:|tel:|\/)/i.test(linkMatch[2]) ? linkMatch[2] : '#';
          earliest = {
            type: 'link',
            index: linkMatch.index!,
            length: linkMatch[0].length,
            node: <a key={partIdx++} href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700">{linkMatch[1]}</a>,
          };
        }

        if (earliest) {
          if (earliest.index > 0) {
            parts.push(remaining.slice(0, earliest.index));
          }
          parts.push(earliest.node);
          remaining = remaining.slice(earliest.index + earliest.length);
        } else {
          parts.push(remaining);
          remaining = '';
        }
      }

      return parts;
    };

    // Block level processing
    const trimmed = line.trim();

    // Blockquote
    if (trimmed.startsWith('>')) {
      result.push(
        <blockquote key={i} className="border-l-[3px] border-emerald-400 dark:border-emerald-600 pl-3 my-1.5 text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 py-1.5 pr-2 rounded-r">
          {processInline(trimmed.replace(/^>\s?/, ''))}
        </blockquote>
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      result.push(
        <h4 key={i} className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-2 mb-1">
          {processInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      result.push(
        <h3 key={i} className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1">
          {processInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (olMatch) {
      result.push(
        <div key={i} className="flex gap-2 text-sm mt-0.5">
          <span className="text-gray-400 dark:text-gray-500 min-w-[1.2em] text-right">{olMatch[1]}.</span>
          <span>{processInline(olMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Unordered list
    if (trimmed.match(/^[-*]\s/)) {
      result.push(
        <div key={i} className="flex gap-2 text-sm mt-0.5">
          <span className="text-emerald-400 dark:text-emerald-500 select-none">•</span>
          <span>{processInline(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Divider
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      result.push(<hr key={i} className="my-2 border-gray-200 dark:border-gray-700" />);
      continue;
    }

    // Regular paragraph
    if (trimmed) {
      result.push(
        <p key={i} className="text-sm leading-relaxed mt-0.5">
          {processInline(line)}
        </p>
      );
    } else {
      result.push(<div key={i} className="h-1.5" />);
    }
  }

  return result;
}
