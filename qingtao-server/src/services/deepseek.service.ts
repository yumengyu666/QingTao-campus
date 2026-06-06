/**
 * DeepSeek API 统一调用服务
 * 同时服务于：AI 内容审核 + 智能助手小轻
 */

const CONFIG = {
  get url() { return process.env.MODERATION_API_URL || ''; },
  get key() { return process.env.MODERATION_API_KEY || ''; },
  get model() { return process.env.MODERATION_MODEL || 'deepseek-v4-flash'; },
  get enabled() { return !!(this.url && this.key); },
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  reasoning_content?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** 'quick' = thinking disabled, 'thinking' = thinking enabled, 'auto' = let model decide */
  mode?: 'quick' | 'thinking' | 'auto';
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  reasoning_content?: string;
  finish_reason: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 非流式调用 DeepSeek API
 */
export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  if (!CONFIG.enabled) {
    throw new Error('DeepSeek API not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const body: any = {
      model: CONFIG.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 1024,
      stream: false,
    };

    // Thinking mode control
    // 'auto' → don't send thinking param (DeepSeek decides)
    // 'quick' → thinking disabled
    // 'thinking' → thinking enabled with high effort
    if (req.mode === 'thinking') {
      body.thinking = { type: 'enabled' };
      body.reasoning_effort = 'high';
    } else if (req.mode === 'quick') {
      body.thinking = { type: 'disabled' };
    }
    // 'auto' → omit thinking field entirely

    const res = await fetch(CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`DeepSeek API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const choice = json?.choices?.[0];
    const msg = choice?.message;

    return {
      content: (msg?.content || '').trim(),
      reasoning_content: msg?.reasoning_content || undefined,
      finish_reason: choice?.finish_reason || 'unknown',
      usage: json.usage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 流式调用 DeepSeek API — 返回 ReadableStream
 * 用于 SSE 推送逐字打字效果
 */
export async function chatCompletionStream(
  req: ChatRequest,
): Promise<{ stream: ReadableStream<Uint8Array>; abort: () => void }> {
  if (!CONFIG.enabled) {
    throw new Error('DeepSeek API not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const body: any = {
      model: CONFIG.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 1024,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (req.mode === 'thinking') {
      body.thinking = { type: 'enabled' };
      body.reasoning_effort = 'high';
    } else if (req.mode === 'quick') {
      body.thinking = { type: 'disabled' };
    }
    // 'auto' → omit thinking field entirely

    const res = await fetch(CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`DeepSeek API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    clearTimeout(timeout);

    return {
      stream: res.body!,
      abort: () => {
        controller.abort();
        clearTimeout(timeout);
      },
    };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}
