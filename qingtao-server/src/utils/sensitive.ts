/**
 * Layer 1: 敏感词表 — 代理到 moderation.middleware 内联词表
 * （此文件保留以维持现有 import 路径兼容）
 */
export { containsSensitive } from '../middleware/moderation.middleware';

import fs from 'fs';
import path from 'path';

export function getMatchedWords(text: string): string[] {
  const wordsPath = path.resolve(__dirname, 'sensitive-words.json');
  const raw = fs.readFileSync(wordsPath, 'utf-8');
  const words = JSON.parse(raw);
  const allWords: string[] = Object.values(words).flat() as string[];
  const matched: string[] = [];
  for (const word of allWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      matched.push(word);
    }
  }
  return matched;
}
