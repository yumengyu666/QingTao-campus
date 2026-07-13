/**
 * DeepSeek API 统一调用服务
 * 同时服务于：AI 内容审核 + 智能助手小轻
 */
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
export declare function chatCompletion(req: ChatRequest): Promise<ChatResponse>;
/**
 * 流式调用 DeepSeek API — 返回 ReadableStream
 * 用于 SSE 推送逐字打字效果
 */
export declare function chatCompletionStream(req: ChatRequest): Promise<{
    stream: ReadableStream<Uint8Array>;
    abort: () => void;
}>;
//# sourceMappingURL=deepseek.service.d.ts.map