# AI 智能体流式输出技术方案

> 通用技术方案：AI 智能体对话中实现思考过程 + 回答内容的实时流式输出，支持打字机效果、推理过程展示、自动降级。

---

## 目录

1. [架构概览](#1-架构概览)
2. [SSE 协议与后端实现](#2-sse-协议与后端实现)
3. [前端流式消费](#3-前端流式消费)
4. [思考过程展示](#4-思考过程展示)
5. [降级策略](#5-降级策略)
6. [关键设计决策](#6-关键设计决策)
7. [完整代码参考](#7-完整代码参考)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                        前端 (Browser)                    │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Chat UI     │◄───│ Stream Hook  │◄───│ fetch SSE  │ │ │
│  │ (React/Vue) │    │ (core logic) │    │ ReadableStr │ │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │ POST /api/agent/chat/stream
                            │ Content-Type: text/event-stream
                            ▼
┌─────────────────────────────────────────────────────────┐
│                       后端 (Node.js)                     │
│                                                         │
│  ┌──────────┐   ┌───────────┐   ┌───────────────────┐  │
│  │ Auth +   │──►│ Controller│──►│ AI API Service    │  │
│  │ Rate Limit│   │           │   │ (DeepSeek/OpenAI) │  │
│  └──────────┘   └───────────┘   └───────────────────┘  │
│                       │                    │            │
│                       │  SSE Stream Relay  │            │
│                       ▼                    ▼            │
│               res.write({              ReadableStream   │
│                 type: 'reasoning',        from AI API   │
│                 content: '...'                          │
│               })                                       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    AI 大模型 API                          │
│            (DeepSeek / OpenAI / 等)                      │
│                                                         │
│  POST /v1/chat/completions                              │
│  { stream: true, stream_options: { include_usage }}     │
│  → 返回 SSE 流，包含：                                   │
│    • reasoning_content (思考过程)                        │
│    • content            (回答正文)                       │
└─────────────────────────────────────────────────────────┘
```

**核心思路**：

> 前端发送 POST 请求 → 后端接收后调用 AI 大模型 API（stream: true）→ 后端逐 chunk 解析 AI 返回的 SSE 流 → 实时转发给前端 → 前端逐字渲染。

---

## 2. SSE 协议与后端实现

### 2.1 服务端 SSE 响应头设置

```javascript
// 设置正确的 SSE 响应头
res.status(200);
res.set({
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',    // 禁用反向代理（如 Nginx）缓冲
});
res.flushHeaders();             // 立即发送头部，不等待 body

// 禁用 Nagle 算法，小块数据立即发送
if (res.socket) res.socket.setNoDelay(true);
```

**为什么需要这些设置？**

| 设置项 | 作用 |
|--------|------|
| `Content-Type: text/event-stream` | 声明 SSE 内容类型 |
| `Cache-Control: no-cache` | 防止浏览器/代理缓存 |
| `X-Accel-Buffering: no` | 禁用 Nginx 的代理缓冲，否则流式数据会被缓冲 |
| `flushHeaders()` | 立即发送 HTTP 头部，让客户端开始等待数据 |
| `setNoDelay(true)` | 禁用 TCP Nagle 算法，小数据包立即发送 |

### 2.2 自定义 SSE 事件格式

不同于标准 `EventSource` 的 `event:` 字段，这里使用 JSON 行格式，更灵活地携带结构化数据：

```javascript
// 事件类型定义
const EventTypes = {
  THINKING_START: 'thinking_start',    // 开始思考（仅 thinking 模式）
  REASONING:     'reasoning',          // 思考过程内容片段
  CONTENT:       'content',            // 回答正文内容片段
  DONE:          'done',               // 流结束
  ERROR:         'error',              // 错误
};

// 发送事件
function writeSSEEvent(res, type, payload = {}) {
  res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
}
```

**实际数据格式：**

```
data: {"type":"thinking_start"}

data: {"type":"reasoning","content":"用户询问如何..."}

data: {"type":"reasoning","content":"需要先理解...然后..."}

data: {"type":"content","content":"好的"}

data: {"type":"content","content":"，发布"}

data: {"type":"content","content":"商品需要..."}

data: {"type":"done","content":"好的，发布商品需要...","reasoning":"用户询问如何...需要先理解...然后..."}
```

### 2.3 调用 AI API 并转发流

```javascript
async function streamChat(req, res) {
  // 1. 构建消息（System Prompt + 历史 + 当前消息）
  const messages = buildMessages(req.userId, req.body.message);

  // 2. 设置 SSE 响应头
  setupSSEHeaders(res);

  // 3. 通知前端开始思考
  if (req.body.mode === 'thinking') {
    writeSSEEvent(res, 'thinking_start');
  }

  try {
    // 4. 调用 AI API 获取流
    const stream = await callAIStream(messages, req.body.mode);

    // 5. 逐 chunk 解析并转发
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let fullReasoning = '';
    let buffer = '';

    // 监听客户端断开
    req.on('close', () => { reader.cancel(); });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // SSE 协议可能合并多行，需要按行拆分
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';   // 最后一行可能不完整

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;

        const parsed = JSON.parse(raw);
        const delta = parsed.choices?.[0]?.delta;

        // 转发思考内容
        if (delta?.reasoning_content) {
          fullReasoning += delta.reasoning_content;
          writeSSEEvent(res, 'reasoning', {
            content: delta.reasoning_content
          });
        }

        // 转发回答正文
        if (delta?.content) {
          fullContent += delta.content;
          writeSSEEvent(res, 'content', {
            content: delta.content
          });
        }
      }
    }

    // 6. 流结束，发送完成事件
    writeSSEEvent(res, 'done', {
      content: fullContent,
      reasoning: fullReasoning || null,
    });
  } catch (err) {
    writeSSEEvent(res, 'error', { message: err.message });
  } finally {
    res.end();
  }
}
```

### 2.4 AI API 流式调用封装

```javascript
async function callAIStream(messages, mode) {
  const body = {
    model: 'your-model-name',
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
    stream_options: { include_usage: true },
  };

  // 思考模式控制（DeepSeek API 示例）
  if (mode === 'thinking') {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = 'high';    // DeepSeek 特有：推理深度
  } else if (mode === 'quick') {
    body.thinking = { type: 'disabled' };
  }
  // mode === 'auto': 不设置 thinking 字段，让模型自行决定

  const controller = new AbortController();

  const response = await fetch('https://api.ai-provider.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  return {
    stream: response.body,
    abort: () => controller.abort(),
  };
}
```

**思考模式三种策略：**

| 模式 | thinking 字段 | 效果 |
|------|---------------|------|
| `thinking` | `{ type: 'enabled' }` | 强制启用深度推理，返回 `reasoning_content` |
| `quick` | `{ type: 'disabled' }` | 禁用推理，不返回 `reasoning_content`，更快 |
| `auto` | 不发送 | 模型自行决定是否推理 |

---

## 3. 前端流式消费

### 3.1 核心 Stream Hook（React 示例）

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning?: string | null;
  isStreaming: boolean;
}

function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const sendMessage = useCallback(async (input: string, mode: 'thinking' | 'quick' | 'auto' = 'auto') => {
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      text: input,
      isStreaming: false,
    };
    const aiMsgId = generateId();
    const aiPlaceholder: Message = {
      id: aiMsgId,
      role: 'assistant',
      text: '',
      reasoning: null,
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, aiPlaceholder]);

    // 创建可中断的请求
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/agent/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: input, mode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // --- 开始消费 SSE 流 ---
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let fullReasoning = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!mountedRef.current) {
          reader.cancel();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          try {
            const event = JSON.parse(trimmed.slice(5).trim());

            switch (event.type) {
              case 'content':
                fullText += event.content;
                updateMessage(aiMsgId, {
                  text: fullText,
                  isStreaming: true,
                });
                break;

              case 'reasoning':
                fullReasoning += event.content;
                updateMessage(aiMsgId, {
                  reasoning: fullReasoning,
                  isStreaming: true,
                });
                break;

              case 'done':
                updateMessage(aiMsgId, {
                  text: event.content || fullText,
                  reasoning: event.reasoning || fullReasoning || null,
                  isStreaming: false,
                });
                break;

              case 'error':
                updateMessage(aiMsgId, {
                  text: event.message || '服务暂不可用',
                  isStreaming: false,
                });
                break;
            }
          } catch (e) {
            // 忽略解析失败的行
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;

      updateMessage(aiMsgId, {
        text: '请求失败，请稍后重试',
        isStreaming: false,
      });
    } finally {
      setAbortController(null);
    }
  }, []);

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const stopGeneration = () => {
    abortController?.abort();
  };

  return { messages, sendMessage, stopGeneration, isGenerating: !!abortController };
}
```

### 3.2 流式渲染 — 打字动画效果

```tsx
function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
        {/* 思考过程展示区 */}
        {message.reasoning && (
          <ReasoningBox reasoning={message.reasoning} />
        )}

        {/* 消息正文 */}
        {message.text ? (
          <div className="prose prose-sm">
            <MarkdownRenderer content={message.text} />
          </div>
        ) : message.isStreaming ? (
          /* 思考中 — 跳动圆点 */
          <ThinkingDots />
        ) : null}

        {/* 打字光标 */}
        {message.isStreaming && message.text && (
          <BlinkingCursor />
        )}
      </div>
    </div>
  );
}

// 跳动圆点动画
function ThinkingDots() {
  return (
    <div className="flex gap-1 py-2">
      {[0, 0.15, 0.3].map((delay, i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

// 闪烁光标
function BlinkingCursor() {
  return (
    <span className="inline-block w-1.5 h-4 bg-current rounded-full ml-0.5 align-middle animate-pulse" />
  );
}
```

### 3.3 状态流转

```
用户点击发送
    │
    ▼
添加 userMsg + aiPlaceholder (text='', isStreaming=true)
    │
    ▼
显示 <ThinkingDots /> (三个跳动圆点)
    │
    ▼
收到第一个 content 事件
    │
    ├─→ text 开始有内容 → 隐藏圆点，显示打字文字 + <BlinkingCursor />
    │
    ├─→ 收到 reasoning 事件 → <ReasoningBox /> 实时增长
    │
    ├─→ 持续收到 content... → text 逐段增长，光标闪烁
    │
    ▼
收到 done 事件
    │
    ▼
isStreaming=false → 光标消失，消息定格
```

---

## 4. 思考过程展示

### 4.1 可折叠思考框

```tsx
function ReasoningBox({ reasoning }: { reasoning: string }) {
  const [expanded, setExpanded] = useState(true); // 默认展开

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mb-1"
      >
        <span className="text-sm">🧠</span>
        {expanded ? '收起思考过程' : '查看思考过程'}
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-900 whitespace-pre-wrap">
            {reasoning}
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

**设计要点：**

- **默认展开**：首次显示思考过程让用户感知 AI 在"思考"
- **紫色主题**：与正文区分，暗示此为"后台思考"
- **实时增长**：流式接收 `reasoning` 事件时，内容逐段追加，无需等待全部完成
- **小字号 + 弱化样式**：思考过程为辅助信息，不喧宾夺主

### 4.2 CSS 动画（Tailwind 或 CSS）

```css
/* 思考框展开/折叠动画 */
.reasoning-box {
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
}
.reasoning-box.collapsed {
  max-height: 0;
  opacity: 0;
}
.reasoning-box.expanded {
  max-height: 1000px;
  opacity: 1;
}
```

---

## 5. 降级策略

当 SSE 流式接口因网络/服务问题失败时，前端自动降级到非流式请求。

### 5.1 降级逻辑

```typescript
const sendMessage = async (input: string, mode: string) => {
  // ... 添加消息到列表 ...

  let streamSuccess = false;

  try {
    const streamRes = await fetch('/api/agent/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ message: input, mode }),
      signal: timeoutSignal(30_000), // 30秒超时
    });

    if (streamRes.ok && streamRes.body) {
      streamSuccess = true;
      await consumeStream(streamRes.body.getReader());
    }
  } catch (err) {
    // SSE 失败，进入降级
  }

  // --- 降级：非流式接口 ---
  if (!streamSuccess) {
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: input, mode }),
      });
      const data = await res.json();
      const fullText = data.reply || '';

      // 用定时器模拟打字效果
      simulateTyping(fullText, aiMsgId);
    } catch (fallbackErr) {
      updateMessage(aiMsgId, {
        text: 'AI 服务暂不可用，请稍后重试',
        isStreaming: false,
      });
    }
  }
};
```

### 5.2 模拟打字效果

```typescript
function simulateTyping(fullText: string, msgId: string) {
  const CHARS_PER_TICK = 2;     // 每 tick 显示 2 个字符
  const TICK_INTERVAL = 30;     // 每 30ms 一次

  let index = 0;
  const timer = setInterval(() => {
    index += CHARS_PER_TICK;
    if (index >= fullText.length) {
      index = fullText.length;
      clearInterval(timer);
      updateMessage(msgId, { text: fullText, isStreaming: false });
    } else {
      updateMessage(msgId, {
        text: fullText.slice(0, index),
        isStreaming: true,
      });
    }
  }, TICK_INTERVAL);
}
```

---

## 6. 关键设计决策

### 6.1 为什么用 fetch + ReadableStream 而非原生 EventSource？

| 特性 | EventSource | fetch + ReadableStream |
|------|-------------|------------------------|
| HTTP 方法 | 仅 GET | GET / POST |
| 自定义 Header | ❌ 不支持 | ✅ 完全支持 |
| 请求体 | ❌ 无 | ✅ JSON body |
| Token 传递 | URL query 参数（不安全） | Authorization Header |
| 中断请求 | ❌ 仅关闭连接 | ✅ AbortController |
| 错误处理 | 自动重连（有时不需要） | 手动控制 |

**结论**：Agent 对话需要 POST 请求体 + Bearer Token + 可控中断，因此选用 fetch + ReadableStream。

### 6.2 为什么使用自定义 JSON SSE 格式？

标准 SSE 的 `event:` + `data:` 字段只能携带纯字符串，而我们需要传递：
- `reasoning` 与 `content` 的区分（类型标记）
- 结束时的汇总信息（完整 content + reasoning）

因此使用 `data: {"type":"xxx", "content":"..."}` 的自定义 JSON 格式。

### 6.3 连接中断与资源释放

```javascript
// 后端：监听客户端断开
let closed = false;
req.on('close', () => {
  closed = true;
  abortAIRequest();   // 中止对 AI API 的请求，避免浪费 token
});

// 前端：组件卸载时取消
useEffect(() => {
  return () => {
    reader?.cancel();     // 取消 ReadableStream
    abortController?.abort();  // 取消 fetch
  };
}, []);
```

### 6.4 为什么需要 separate 思考过程和正文？

大模型 API（如 DeepSeek、Claude）支持两种输出：
- **reasoning_content**：模型的内部推理
- **content**：模型的最终回答

将它们分开展示的好处：
- 用户可以看到 AI 的推理逻辑，增加透明度
- 可折叠设计不占用过多空间
- 帮助开发者调试 prompt 效果

---

## 7. 完整代码参考

### 7.1 项目结构建议

```
src/
├── services/
│   └── ai/
│       ├── ai-client.ts          # AI API 调用封装（流式 + 非流式）
│       └── sse-helper.ts         # SSE 写入工具函数
├── controllers/
│   └── chat.controller.ts        # 聊天接口（stream + non-stream）
├── hooks/
│   ├── useChatStream.ts          # 前端核心流式消费 Hook
│   └── useTypingSimulation.ts    # 降级打字模拟 Hook
├── components/
│   ├── ChatBubble.tsx            # 消息气泡
│   ├── ReasoningBox.tsx          # 思考过程可折叠框
│   ├── ThinkingDots.tsx          # 思考中跳动圆点
│   └── BlinkingCursor.tsx        # 闪烁光标
└── middleware/
    ├── rate-limiter.ts           # 限流中间件
    └── circuit-breaker.ts        # 熔断器中间件
```

### 7.2 后端 SSE 工具函数

```typescript
// sse-helper.ts

/** 设置 SSE 响应头 */
export function setupSSEHeaders(res: Response): void {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // 禁用 Nagle 算法
  if (res.socket) {
    res.socket.setNoDelay(true);
  }
}

/** 写入 SSE 事件 */
export function writeSSEEvent(
  res: Response,
  type: 'thinking_start' | 'reasoning' | 'content' | 'done' | 'error',
  payload: Record<string, unknown> = {},
): void {
  const data = JSON.stringify({ type, ...payload });
  res.write(`data: ${data}\n\n`);
}

/** 解析 AI API SSE 流并转发 */
export async function relayAIStream(
  aiStream: ReadableStream<Uint8Array>,
  onReasoning: (chunk: string) => void,
  onContent: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ content: string; reasoning: string }> {
  const reader = aiStream.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let fullReasoning = '';
  let buffer = '';

  // 监听中断信号
  if (signal) {
    signal.addEventListener('abort', () => reader.cancel());
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;

        try {
          const parsed = JSON.parse(raw);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content;
            onReasoning(delta.reasoning_content);
          }
          if (delta?.content) {
            fullContent += delta.content;
            onContent(delta.content);
          }
        } catch {
          // 忽略无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content: fullContent, reasoning: fullReasoning };
}
```

### 7.3 前端 Hook 的 TypeScript 类型定义

```typescript
// types.ts

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning?: string | null;
  isStreaming: boolean;
  timestamp: number;
}

export type ThinkingMode = 'thinking' | 'quick' | 'auto';

export interface SSEChatEvent {
  type: 'thinking_start' | 'reasoning' | 'content' | 'done' | 'error';
  content?: string;
  reasoning?: string;
  message?: string;
}

export interface UseChatStreamReturn {
  messages: ChatMessage[];
  sendMessage: (input: string, mode?: ThinkingMode) => Promise<void>;
  stopGeneration: () => void;
  clearHistory: () => void;
  isGenerating: boolean;
}
```

### 7.4 轮询替代方案（适用于不支持 SSE 的环境）

如果目标环境不支持 SSE（如某些小程序平台），可使用轮询替代：

```typescript
// 后端：生成任务 ID，前端轮询获取增量
async function pollChat(req, res) {
  const taskId = generateTaskId();
  await startAITask(taskId, messages);

  res.json({ taskId });
}

// 获取增量内容
async function getPollResult(req, res) {
  const { taskId, cursor } = req.query;
  const { content, reasoning, done, nextCursor } =
    await getTaskDelta(taskId, Number(cursor));

  res.json({ content, reasoning, done, cursor: nextCursor });
}
```

前端每 200ms 轮询一次，根据 `done` 字段决定是否停止。

---

## 附录：常见问题

### Q1: 为什么流式输出有时会卡住？

**原因**：反向代理（Nginx）默认会缓冲响应。**解决**：添加 `X-Accel-Buffering: no` 响应头，或在 Nginx 配置中添加 `proxy_buffering off;`。

### Q2: 如何限制用户使用频率？

**方案**：在控制器前添加限流中间件，使用内存或 Redis 计数器。

```javascript
// 简单内存限流器示例
const rateLimitMap = new Map();

function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.userId;
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ error: '请求过于频繁' });
    }

    record.count++;
    rateLimitMap.set(key, record);
    next();
  };
}

// 使用：每用户每天最多 50 次
app.post('/api/agent/chat/stream', rateLimit(50, 24 * 60 * 60 * 1000), chatStream);
```

### Q3: 思考过程太长怎么办？

**两个策略**：
1. **前端截断**：只展示前 500 字，加"展开全部"按钮
2. **后端限制**：在 prompt 中限制推理长度，或设置 `max_tokens` 参数

### Q4: 多个并发请求如何处理？

- 使用 AbortController 在上一个新请求发送前取消旧请求
- 或在前端禁用发送按钮直到当前请求完成

---

## 总结

本方案实现了一套完整的 AI 智能体流式输出系统，核心要点：

1. **后端**：设置 SSE 响应头 → 调用 AI API 流式接口 → 解析 chunk → 以自定义 JSON SSE 格式转发
2. **前端**：fetch + ReadableStream 消费 SSE 流 → 逐 chunk 更新 UI → 打字机效果
3. **思考过程**：与正文分离，实时增长，可折叠展示
4. **降级**：流式失败自动切换到非流式 + 模拟打字
5. **资源管理**：客户端断开即中止上游请求，避免 token 浪费

---

*本文档为通用技术方案，无项目特定信息，可直接应用于任何需要 AI 流式对话的项目中。*
