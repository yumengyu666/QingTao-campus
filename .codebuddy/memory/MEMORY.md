# 轻淘校园项目 - 长期记忆

## 核心原则（永远记住）
**出现问题，需要找源头、设边界，不在后果上反复修补。**

## 项目
- 郑州轻工业大学校园二手交易 + 社区平台
- 前端: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 (端口 5175)
- 后端: Express + Prisma 5 + SQLite + JWT (端口 3000)
- 数据库: SQLite (WAL 模式), 44 个数据表


## 关键修复记录 (2026-06-12)
1. **验证码 bug**: `auth.schema.ts` 中 `captchaAnswer` 要求 length(4)，但数学答案只有1-2位。改为 min(1).max(4)
2. **数据库乱码**: 分类 1-6 和3条测试内容编码问题，已用 UPDATE 修复
3. **浏览器自动化**: `agent-browser` 被墙不可用，使用 `playwright-cli` 替代

## 已知问题
- WebSocket 代理: `/ws` 在 vite.config.ts 配置了 proxy 但 ws server 可能需要调整
- DeepSeek AI 审核: 依赖外部 API 网络环境
