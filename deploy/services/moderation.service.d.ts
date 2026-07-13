/**
 * Layer 2: AI 内容审核 — DeepSeek V4 Flash
 *
 * 设计遵循《防违规机器人设计指南》：
 * - 角色原子化：提示词锁定"只能判断违规"
 * - 输出符号化：只有 0（安全）或 1（违规）
 * - 免疫显式化：列举攻击类型并声明无效
 * - 技术兜底化：temperature=0, max_tokens=1, 超时降级
 * - 非 0/1 输出：重试 1 次，仍异常 → 放行
 * - 熔断机制：滑动窗口 + 半开恢复
 */
export declare function aiModerate(text: string, auditCtx?: {
    userId?: number;
    contentType?: string;
}): Promise<'safe' | 'violation' | 'error'>;
//# sourceMappingURL=moderation.service.d.ts.map