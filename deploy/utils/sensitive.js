"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsSensitive = void 0;
exports.getMatchedWords = getMatchedWords;
/**
 * Layer 1: 敏感词表 — 代理到 moderation.middleware 内联词表
 * （此文件保留以维持现有 import 路径兼容）
 */
var moderation_middleware_1 = require("../middleware/moderation.middleware");
Object.defineProperty(exports, "containsSensitive", { enumerable: true, get: function () { return moderation_middleware_1.containsSensitive; } });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getMatchedWords(text) {
    const wordsPath = path_1.default.resolve(__dirname, 'sensitive-words.json');
    const raw = fs_1.default.readFileSync(wordsPath, 'utf-8');
    const words = JSON.parse(raw);
    const allWords = Object.values(words).flat();
    const matched = [];
    for (const word of allWords) {
        if (text.toLowerCase().includes(word.toLowerCase())) {
            matched.push(word);
        }
    }
    return matched;
}
//# sourceMappingURL=sensitive.js.map