# 👁️ Code Review: notes.controller.ts

**PR:** 假设 PR #xxx — notes 模块实现
**Reviewer:** Senior Developer（资深开发工程师）
**Date:** 2026-06-12

---

## Overall Assessment

`notes.controller.ts` 是一个 **513 行的"胖"控制器反模式典型案例**。它复用了 `Post` 模型作为"笔记"载体，但所有业务逻辑（查询构建、排序算法、标签管理、浏览量去重、关联推荐、收藏夹操作、话题关注）全部嵌入控制器中。**必须重构**，否则团队其他成员会照此模式层层复制，导致项目架构持续劣化。

---

## Issues Found

| # | Severity | Category | File:Line | Description |
|---|----------|----------|-----------|-------------|
| 1 | 🔴 Blocker | Architecture | notes.controller.ts:1-513 | 513 行"胖"控制器，零 Service 层 |
| 2 | 🔴 Blocker | Anti-pattern | notes.controller.ts:19,30,483 | 3 处 `const where: any` — Prisma where 应使用类型化构建器 |
| 3 | 🔴 Blocker | Anti-pattern | notes.controller.ts:509-513 | `viewDedup` Map + setInterval 放在 controller 模块顶层 — 状态泄漏 |
| 4 | 🟡 Suggestion | Architecture | notes.controller.ts:170-174 | `afterCreate` 通过懒加载 `await import()` 调用 — 应通过依赖注入 |
| 5 | 🟡 Suggestion | Consistency | notes.controller.ts:5 | 使用 `containsSensitive` (旧版)，而非 `moderateBody` 中间件 |
| 6 | 🟡 Suggestion | Duplication | notes.controller.ts:48-52 | JSON.parse 解包模式在 4 处重复 |
| 7 | 🟡 Suggestion | Performance | notes.controller.ts:155-167 | 标签关联在 `for...of` 循环中逐个 upsert — 缺少批量操作 |
| 8 | 💭 Nit | Naming | notes.controller.ts:1-513 | Controller 名为 notes 但操作 Post 模型 — 命名歧义 |
| 9 | 💭 Suggestion | Error handling | notes.controller.ts:89 | `.catch(() => {})` — 浏览量更新静默失败 |

---

## 逐条详解

### 🔴 Issue #1 — 513 行胖控制器（零 Service 层）

**What:** 整个文件所有函数直接操作 `prisma`，包含：
- 查询条件构建（`getNotes`, `getTagFeed`）
- 排序逻辑（`sort === 'hot'` → `likeCount`, `sort === 'recommend'` → `isFeatured + likeCount`）
- 标签关联管理（`createNote`, `updateNote`）
- 浏览量去重与定时清理（`viewDedup` Map + `setInterval`）
- 关联推荐算法（`getNoteDetail:94-112`）
- 收藏夹 CRUD（`getCollections` ~ `getCollectionNotes`）
- 话题关注/动态流（`followTag` ~ `getTagFeed`）

**Why it matters:** 按照你们自己的规范（§3.2）："Controller 保持薄层：只做参数提取 + 权限校验 + 响应格式化"。当前文件严重违反。

**Suggestion:** 拆分为：

```
services/
├── notes.service.ts        ← 笔记 CRUD + 查询构建 + 排序 + 关联推荐
├── collection.service.ts   ← 收藏夹 CRUD
├── tag.service.ts          ← 话题关注 + 动态流
└── view-counter.service.ts ← 浏览量去重（提取 viewDedup）
```

---

### 🔴 Issue #2 — `any` 类型污染 Prisma 查询

```typescript
// notes.controller.ts:19
const where: any = { isDeleted: false, status: { in: ['approved', 'pending'] } };
// notes.controller.ts:30
let orderBy: any = { createdAt: 'desc' };
// notes.controller.ts:483
const where: any = { isDeleted: false, status: 'approved', tags: { some: ... } };
// notes.controller.ts:95
let related: any[] = [];
```

**Why it matters:** `any` 完全绕过了 TypeScript 类型检查。如果 Prisma schema 变更（如字段重命名），这些查询会在**运行时**才报错。

**Suggestion:** 使用 Prisma 推导的类型：
```typescript
const where: Prisma.PostWhereInput = { ... };
let orderBy: Prisma.PostOrderByWithRelationInput = { ... };
```

---

### 🔴 Issue #3 — Controller 模块顶层状态泄漏

```typescript
// notes.controller.ts:509-513
const viewDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewDedup) { if (now - t > 30 * 60 * 1000) viewDedup.delete(k); }
}, 10 * 60 * 1000).unref();
```

**Why it matters:**
1. **测试不可行** — `viewDedup` 是模块级单例，测试间状态会互相污染
2. **违反关注点分离** — 业务状态（去重 Map）不应在 controller 文件中
3. **定时器无生命周期管理** — 如果进程需要优雅关闭，这个 interval 没有被清理

**Suggestion:** 提取到 `services/view-counter.service.ts`，使用 class 封装：
```typescript
class ViewCounter {
  private dedup = new Map<string, number>();
  private cleanupTimer: NodeJS.Timeout;
  
  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }
  
  shouldCount(key: string): boolean { ... }
  
  destroy() { clearInterval(this.cleanupTimer); }
}

export const viewCounter = new ViewCounter();
```

---

### 🟡 Issue #5 — 双重敏感词检测

```typescript
// notes.controller.ts:5 — 使用旧版工具
import { containsSensitive } from '../utils/sensitive';
// notes.controller.ts:136-137 — 手动调用而非中间件
if (containsSensitive(title)) return error(res, '标题包含违规内容');
if (content && containsSensitive(content)) return error(res, '内容包含违规内容');
// notes.controller.ts:170 — 然后再手动触发 AI 审核
const { afterCreate } = await import('../middleware/moderation.middleware');
```

**Why it matters:** 你们的标准（§3.1）明确说"内容发布路由必须挂载 moderateBody"。但这里走了完全不同的路径：手动 L1 + 懒加载 L2。

**Suggestion:** 在路由层统一使用 `moderateBody` 中间件，控制器只关心业务逻辑：
```typescript
// notes.routes.ts
router.post('/', authMiddleware, moderateBody, controller.create);
```

---

## Required Changes (Before Merge)

- [ ] #1 创建 `notes.service.ts` / `collection.service.ts` / `tag.service.ts`，将业务逻辑移出控制器
- [ ] #2 消除所有 `any` 类型，使用 `Prisma.WhereInput` 等 Prisma 推导类型
- [ ] #3 将 `viewDedup` 提取到独立服务

## Recommended Changes (Before Next Release)

- [ ] #5 统一使用 `moderateBody` 中间件替代手动 `containsSensitive`
- [ ] #7 标签关联改为批量 upsert

## Verdict

- [ ] Approve (no blockers)
- [ ] Approve with suggestions
- [x] **Request changes** (blockers exist — 必须重构为 Service 模式后再合并)
