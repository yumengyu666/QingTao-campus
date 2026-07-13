/**
 * Layer 1: 敏感词表 — 代理到 moderation.middleware 内联词表
 * （此文件保留以维持现有 import 路径兼容）
 */
export { containsSensitive } from '../middleware/moderation.middleware';
export declare function getMatchedWords(text: string): string[];
//# sourceMappingURL=sensitive.d.ts.map