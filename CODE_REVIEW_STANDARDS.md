# 轻淘 QingTao — 代码审查标准与流程

> 版本：v1.0 | 生效日期：2026-06-12 | 适用范围：全项目

---

## 目录

1. [审查流程](#1-审查流程)
2. [审查角色与职责](#2-审查角色与职责)
3. [后端审查清单](#3-后端审查清单)
4. [前端审查清单](#4-前端审查清单)
5. [数据库审查清单](#5-数据库审查清单)
6. [安全审查清单](#6-安全审查清单)
7. [命名与风格约定](#7-命名与风格约定)
8. [审查模板](#8-审查模板)
9. [自动化工具链](#9-自动化工具链)
10. [质量度量与目标](#10-质量度量与目标)

---

## 1. 审查流程

### 1.1 基本流程

```
开发者提交 PR
    │
    ▼
[1] 自动化检查 (CI Pre-check)
    ├── ESLint / TypeScript 编译
    ├── Prettier 格式检查
    └── 后端/前端 构建验证
    │
    ▼
[2] 自审 (Self Review)
    ├── 提交者使用审查清单自查
    └── 在 PR 描述中填写自审结果
    │
    ▼
[3] 同行评审 (Peer Review)
    ├── 至少 1 位 reviewer 批准
    ├── 复杂变更需 2 位 reviewer
    └── 按紧急程度分级响应
    │
    ▼
[4] 修复 → 重新审查
    │
    ▼
[5] Merge（Squash & Merge）
```

### 1.2 分级响应机制

| 级别 | 场景 | reviewer 响应时限 |
|------|------|-------------------|
| 🔴 Critical | 安全漏洞修复、线上 Bug | 4 小时内 |
| 🟡 High | 核心功能变更、数据迁移 | 24 小时内 |
| 🟢 Normal | 通用功能开发、优化 | 48 小时内 |
| ⚪ Low | 文档、样式微调 | 72 小时内 |

### 1.3 PR 规模控制

- **单个 PR 不超过 400 行变更**（排除自动生成文件）
- 超过 400 行应拆分为多个 PR
- 重构类 PR 允许例外，但需在描述中说明原因
- 禁止"大杂烩"PR（一个 PR 改多个不相关模块）

### 1.4 PR 描述规范

```markdown
## 变更概述
简要说明做了什么、为什么做。

## 关联 Issue
Closes #123

## 自审清单
- [ ] 本地 `npm run build` 通过（前端 & 后端）
- [ ] 新增接口已添加 Zod 验证
- [ ] 敏感操作已做权限校验（作者匹配 / admin 检查）
- [ ] 涉及通知的功能已调用 `createNotification`
- [ ] 内容发布接口已挂 `moderateBody` 中间件
- [ ] 无硬编码密钥/密码
- [ ] 前端 `ErrorBoundary` 包裹了新页面

## 测试
- [ ] 手动测试场景（描述测试步骤）
- [ ] 新增测试文件（如有）

## 截图（前端变更必须）
| Before | After |
|--------|-------|
|        |       |
```

---

## 2. 审查角色与职责

| 角色 | 职责 | 关注点 |
|------|------|--------|
| **提交者** | 自审、写清 PR 描述、及时响应反馈 | 对变更负责 |
| **Reviewer** | 检查逻辑正确性、安全性、可维护性 | 全局视角 |
| **技术负责人** | 架构一致性最终裁定、合并审批 | 长期架构 |

---

## 3. 后端审查清单

> 基于本项目技术栈：Express 4 + Prisma 5 + SQLite + Zod 4 + JWT

### 3.1 路由层 (routes/)

```
□ 路由命名遵循 RESTful 约定
□ GET 请求不产生副作用
□ 正确使用 HTTP 方法 (GET/POST/PUT/DELETE)
□ 敏感路由已挂载 authMiddleware
□ 管理员路由已挂载 adminMiddleware
□ 内容发布路由已挂载 moderateBody
□ 涉及上传的路由已挂载 upload 中间件
□ 查询类路由已挂载 validateQuery
```

### 3.2 控制器层 (controllers/)

```
□ 控制器保持"薄层"：只做参数提取 + 权限校验 + 响应格式化
□ 复杂业务逻辑已提取到 services/
□ 使用统一响应格式 (success / error / paginated / notFound 等)
□ 异步错误统一 next(err) 而非 try-catch 返回 200 error
□ 涉及资源所有权的操作已校验作者身份
    - 编辑: 检查 req.user.userId === resource.userId
    - 删除: 同上
    - 管理员操作: 检查 req.user.role === 'admin'
□ 涉及通知场景已调用 notification service
□ 内容创建后已调用 AI 审核 (moderation service)
□ 无直接字符串拼接 SQL（Prisma 已天然防止，但需注意 $queryRaw）
```

### 3.3 服务层 (services/)

```
□ 单一职责：每个 service 文件处理一个业务域
□ 数据库查询使用 Prisma 而非 $queryRaw（除非必要）
□ include/select 明确指定字段，避免返回密码/敏感信息
□ 分页查询使用 findMany + skip + take，避免全量加载
□ 事务操作使用 prisma.$transaction
□ 有适当的错误处理，关键操作有日志
```

### 3.4 中间件 (middleware/)

```
□ 中间件职责单一，不耦合业务逻辑
□ 错误被正确传递 (next(err)) 而非静默吞掉
□ 限流中间件分级合理（登录严格、查询宽松）
□ 认证中间件正确处理过期/无效/封禁三种状态
```

### 3.5 验证 (Zod Schema)

```
□ 所有用户输入接口均有 Zod schema 验证
□ Schema 放在 src/schemas/ 对应文件
□ 字符串长度有上限（防止 DoS）
□ 数字有范围约束（防止溢出/注入）
□ 枚举值使用 z.enum 而非 z.string
□ 可选字段使用 .optional() 而非 .nullable()
□ URL 字段使用 .url() 验证
```

### 3.6 错误处理

```
□ 不向客户端暴露内部错误详情（生产环境）
□ 使用 AppError 自定义错误类携带业务错误码
□ 关键路径有 try-catch 且日志记录完整
□ API 调用外部服务（DeepSeek）有超时和重试
□ 熔断器（circuit-breaker）正确触发和恢复
```

### 3.7 后端反模式警示

本项目已发现的常见问题，审查时重点检查：

| 反模式 | 示例 | 正确做法 |
|--------|------|----------|
| ❌ 新模块缺通知 | 恋爱请求不发通知 → 对方不知道 | 涉及交互的操作必须调 `createNotification` |
| ❌ 新模块缺审核 | Q&A 零 AI 审核 → 违规内容可发布 | 所有内容发布路由必须挂 `moderateBody` |
| ❌ ID 可遍历 | `/goods/122` 看到待审核商品 | 非本人/非管理员的非公开内容返回 404 |
| ❌ AI 静默失效 | `return 'unknown'` → 无日志无告警 | 首次失效必须记录日志，连续失效触发告警 |
| ❌ 无暴力破解防护 | 登录不限次数 | `/auth/login` 需专门 `loginLimiter` |

---

## 4. 前端审查清单

> 基于本项目技术栈：React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Zustand + React Query

### 4.1 组件结构

```
□ 组件文件命名: PascalCase.tsx
□ 每个文件只导出一个主要组件
□ 超过 200 行的组件考虑拆分
□ 使用 TypeScript 类型定义 Props/State
□ 避免使用 any，必要时用 unknown + 类型守卫
□ 使用 React 19 新特性 (use() hook, Server Components 等适时评估)
```

### 4.2 状态管理

```
□ UI 状态放入 Zustand store (uiStore)
□ 服务端数据使用 TanStack React Query
□ 认证状态使用 authStore（已含 localStorage 持久化）
□ 不在组件内直接操作 localStorage，通过 storage 工具
□ 避免 prop drilling 超过 3 层
```

### 4.3 数据获取

```
□ 统一使用 apiFetch 封装，不直接调 fetch
□ GET 请求使用 React Query 管理缓存和重取
□ POST/PUT/DELETE 使用 useMutation
□ 正确处理 loading / error / empty 三种状态
□ 列表页使用 Skeleton 占位，非空白闪烁
```

### 4.4 路由与权限

```
□ 新页面在 router/index.tsx 中注册（懒加载）
□ 需登录页面使用 ProtectedRoute 包裹
□ 管理员页面额外使用 AdminRoute 守卫
□ 普通用户访问 /admin 必须重定向，不可看到空壳页面
```

### 4.5 UI 与交互

```
□ 使用项目 Design Tokens (globals.css 中的 CSS 变量)
□ 响应式设计：移动端 (sm) / 平板 (md) / 桌面 (lg)
□ EmptyState 组件填充空数据场景
□ 操作有加载状态和反馈（Toast / 骨架屏）
□ 新页面使用 ErrorBoundary 包裹
□ 图片使用 LazyImage 组件懒加载
□ 避免闪屏：数据加载前显示 Skeleton 而非空白
```

### 4.6 前端反模式警示

| 反模式 | 示例 | 正确做法 |
|--------|------|----------|
| ❌ 页面无错误边界 | 组件崩溃 → 白屏 | 每个页面用 `ErrorBoundary` 包裹 |
| ❌ 硬编码 API URL | `fetch('http://localhost:3000/api/goods')` | 使用 `apiFetch('/goods')` |
| ❌ 空状态无处理 | 列表为空 → 空白页 | 使用 `EmptyState` 组件 |
| ❌ 管理页面无路由守卫 | 普通用户可访问 `/admin` | 使用 `<AdminRoute>` |
| ❌ 无网络状态检查 | 断网 → 请求卡死 | 使用 `useNetworkStatus` hook |
| ❌ JSX 语法错误 | 多余闭合标签 → 构建失败 | 提交前 `npm run build` 验证 |

---

## 5. 数据库审查清单

> 基于本项目：Prisma 5 + SQLite (WAL mode)

### 5.1 Schema 设计

```
□ 新模型命名遵循 PascalCase，表名使用 @@map 映射为 snake_case
□ 关联字段命名: relatedId (如 userId, categoryId)
□ 所有表有 createdAt / updatedAt
□ 软删除使用 isDeleted (boolean) + deletedAt (DateTime?)
□ 字符串字段有合理长度限制 (@db.Text 或指定长度)
□ 唯一约束使用 @@unique 复合索引
□ 必要的索引已通过 @@index 创建
□ 计数字段有默认值 0 (likeCount, commentCount, viewCount)
```

### 5.2 查询安全

```
□ 禁止使用 $queryRaw 拼接用户输入
□ 必须使用参数化: $queryRaw`SELECT ... WHERE id = ${id}` ✅
□ 而非: $queryRaw(`SELECT ... WHERE id = ${id}`) ❌
□ Prisma 查询不将用户输入直接用于字段名/表名
□ 分页使用 skip + take，非 offset + limit
```

### 5.3 迁移策略

```
□ 当前使用 prisma db push（开发阶段可接受）
□ 计划迁移到 prisma migrate dev（生产环境必须）
□ Schema 变更需在 PR 中附带数据迁移说明
□ 新增必填字段需提供默认值或迁移脚本
```

---

## 6. 安全审查清单

> 基于本项目已发现 18 项 P0 安全/功能缺口制定

### 6.1 认证与授权 (P0 必查)

```
□ JWT Secret 不低于 256 位，存储在 .env 不提交
□ 密码使用 bcryptjs 哈希，不复原
□ Access Token 有效期 ≤ 2 小时
□ Refresh Token 轮换机制正确
□ tokenVersion 机制在密码修改时正确递增
□ 登出时将 Refresh Token 加入黑名单
□ 登录接口有速率限制 (loginLimiter)
□ 资源所有权校验: 编辑/删除前验证 req.user.userId === resource.userId
□ 管理员操作: 验证 req.user.role === 'admin'
□ 非公开内容（待审核/已删除）对非作者/非管理员返回 404
```

### 6.2 输入验证

```
□ 所有用户输入经过 Zod schema 验证
□ 字符串长度有上限（防止 DoS 和数据库截断报错）
□ 数字 ID 使用 z.number().int().positive()
□ 文件上传验证真实 MIME 类型（非仅扩展名）
□ 上传文件大小限制（图片 ≤ 10MB）
□ HTML/富文本输入做 XSS 过滤
```

### 6.3 内容审核

```
□ 所有用户生成内容接口必须挂 moderateBody 中间件
□ 300+ 敏感词表覆盖中文敏感词
□ DeepSeek AI 异步审核不阻塞请求
□ AI 审核失败有日志记录和告警（避免静默失效）
□ 高危词表即时拦截（不等 AI 审核）
□ 图片审核：模糊图处理 + AI 审核
```

### 6.4 安全头部与传输

```
□ Helmet 中间件已启用（设置安全头）
□ CORS 配置白名单而非 `*`
□ API 响应不泄露服务器信息
□ 生产环境强制 HTTPS
□ Cookie 设置 httpOnly + secure + sameSite
```

### 6.5 常见漏洞检查

```
□ SQL 注入: 不使用字符串拼接 SQL（✅ Prisma 已防）
□ XSS: JSON 响应 Content-Type 为 application/json（✅ Express 默认）
□ CSRF: JWT 认证时检查 Origin/Referer
□ ID 遍历: 所有查询接口校验资源所有权
□ 路径遍历: 文件路径不拼接用户输入
□ 暴力破解: 登录/验证码/密码重置有限频
□ SSRF: 用户提供的 URL 不做服务端请求
```

---

## 7. 命名与风格约定

> 详见 `CODEX.md`

### 7.1 文件命名

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| React 组件 | PascalCase | `GoodsCard.tsx` |
| React 页面 | PascalCase + Page 后缀 | `GoodsDetailPage.tsx` |
| Hook | camelCase + use 前缀 | `useAuth.ts` |
| Store | camelCase + Store 后缀 | `authStore.ts` |
| 工具函数 | camelCase | `format.ts`, `validators.ts` |
| Express 路由 | kebab-case + .routes | `goods.routes.ts` |
| Controller | kebab-case + .controller | `goods.controller.ts` |
| Service | kebab-case + .service | `goods.service.ts` |
| 中间件 | kebab-case + .middleware | `moderation.middleware.ts` |
| Zod Schema | kebab-case | `goods.schema.ts` |

### 7.2 TypeScript 风格

```typescript
// ✅ 接口命名: PascalCase, 不含 I 前缀
interface GoodsItem { ... }

// ✅ 类型别名: PascalCase
type SortOrder = 'asc' | 'desc';

// ✅ 枚举: PascalCase
enum GoodsStatus { ... }

// ✅ 常量: UPPER_SNAKE_CASE
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// ✅ 函数: camelCase, 动词开头
async function findGoodsById(id: number) { ... }
```

### 7.3 SQLite 注意事项

```
□ 避免并发写入冲突（SQLite 单写者）
□ 使用 WAL 模式（✅ 已启用）
□ 批量写入使用 prisma.$transaction
□ GET 请求自动重试已在前端实现（应对偶发繁忙）
□ 长事务会锁表 → 保持事务短小
```

---

## 8. 审查模板

### 8.1 审查评论格式

统一使用以下格式，每条评论包含：**严重程度标记 + 问题类型 + 具体位置 + 原因 + 建议**

```markdown
🔴 **Security: 越权访问风险**
`goods.controller.ts:84`: 非公开状态的商品对未登录用户也返回了数据。

**Why:** 攻击者可通过递增 ID 遍历所有商品（含待审核/被删除），泄漏用户隐私。

**Suggestion:**
```typescript
if (!['approved', 'sold'].includes(goods.status) && !isOwner && !isAdmin) {
  return notFound(res, '商品不存在');
}
```

---

🟡 **Architecture: 业务逻辑应下沉到 Service 层**
`goods.controller.ts:14-18`: 浏览量去重 Map 和清理定时器放在了 controller 中。

**Why:** Controller 应只负责参数提取和响应格式化。业务状态（去重 Map）放在 controller 中会导致状态分散和测试困难。

**Suggestion:**
- 将 `viewDedup` Map 和清理逻辑移到 `services/goods.service.ts`
- Controller 调用 `goodsSvc.recordView(id, ip)` 即可

---

💭 **Naming: 变量名可更具描述性**
`api.ts:27`: `const doFetch = () => ...`

**Suggestion:** 考虑 `const executeRequest` 或 `performFetch`，更清晰地表达意图。
```

### 8.2 审查总结模板

每次审查完成时，提供以下总结：

```markdown
## 👁️ Code Review Summary

**PR:** #xxx — [PR 标题]
**Reviewer:** [姓名]
**Date:** 2026-xx-xx

### Overall Assessment

[1-2 句话总结：变更质量、主要风险、是否可合并]

### What's Good 👍

- [值得称赞的实现]
- [良好模式可以推广]

### Issues Found

| # | Severity | Category | File | Description |
|---|----------|----------|------|-------------|
| 1 | 🔴 Blocker | Security | controller.ts:42 | 越权访问 |
| 2 | 🟡 Suggestion | Performance | service.ts:88 | N+1 查询 |
| 3 | 💭 Nit | Naming | types.ts:15 | 命名歧义 |

### Required Changes (Before Merge)

- [ ] #1 修复越权访问

### Recommended Changes (Before Next Release)

- [ ] #2 优化 N+1 查询

### Verdict

- [ ] Approve (no blockers)
- [ ] Approve with suggestions
- [ ] Request changes (blockers exist)
```

---

## 9. 自动化工具链

### 9.1 当前已配置

| 工具 | 配置位置 | 状态 |
|------|----------|:----:|
| ESLint 10 | `qing-tao-campus/eslint.config.js` | ✅ |
| TypeScript 严格模式 | `qingtao-server/tsconfig.json` | ✅ |
| Vite Build | `npm run build` | ✅ |
| Prettier | 待配置 | ⬜ |

### 9.2 建议新增

```json
// package.json scripts 增加:
{
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx,css}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,css}'",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "review": "npm run lint && npm run type-check && npm run test && npm run build"
  }
}
```

### 9.3 推荐的 Pre-commit Hook

```bash
# 使用 husky + lint-staged
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// .lintstagedrc.json
{
  "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "src/**/*.{css,json}": ["prettier --write"]
}
```

### 9.4 CI 流水线建议（未来引入 GitHub Actions 后）

```yaml
# .github/workflows/review.yml
name: Code Review
on: [pull_request]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npm run review  # lint + type-check + test + build
```

---

## 10. 质量度量与目标

### 10.1 当前状态（2026-06-12）

| 指标 | 当前值 | 目标值 | 达成时间 |
|------|--------|--------|----------|
| P0 Bug 数量 | 18 | 0 | 2 周内 |
| 后端测试文件数 | ~0 | ≥ 20 | 1 个月内 |
| 前端测试文件数 | 10 | ≥ 30 | 1 个月内 |
| 构建错误 | 2 | 0 | 已修复 ✅ |
| 代码审查覆盖率 | 0% | 100% 新代码 | 即日生效 |
| AI 审核覆盖模块 | ~60% | 100% UGC 模块 | 1 周内 |

### 10.2 审查速查卡

打印或收藏此卡，每次审查前过一遍：

```
┌─────────────────────────────────────────┐
│         🔍 代码审查速查卡                 │
├─────────────────────────────────────────┤
│ 🔴 安全检查：                             │
│   □ 资源所有权校验 (userId/role)          │
│   □ 非公开内容不可遍历                     │
│   □ 输入有 Zod 验证                       │
│   □ 敏感词 + AI 审核已挂载                │
│   □ 无密钥硬编码                           │
├─────────────────────────────────────────┤
│ 🟡 功能完整性：                           │
│   □ 涉及通知的交互已调 createNotification  │
│   □ 新页面有 ErrorBoundary                │
│   □ 错误/空/加载三种状态都处理了           │
│   □ AI 审核失败有日志无静默               │
│   □ 登录/注册有限频                       │
├─────────────────────────────────────────┤
│ 💭 代码质量：                             │
│   □ Controller 薄层，逻辑在 Service       │
│   □ 前后端命名一致（如 goods → goods）    │
│   □ npm run build 通过                   │
│   □ 无 console.log 残留                   │
│   □ 中文硬编码应抽为常量                   │
└─────────────────────────────────────────┘
```

---

## 附录 A：本项目常见问题速查

> 基于 6 轮测试发现的重复性问题

| # | 问题 | 出现次数 | 检查方法 |
|---|------|:---:|----------|
| 1 | 新功能忘记加通知 | 5+ | grep `createNotification` 在新增 controller 中 |
| 2 | 新模块忘记加审核 | 3 | 检查路由是否挂载 `moderateBody` |
| 3 | 非公开内容 ID 可遍历 | 3 | 检查 `findById` 后的权限判断 |
| 4 | 前端构建语法错误 | 2 | `npm run build` 必过 |
| 5 | AI 审核静默失效 | 1 | 检查 `return 'unknown'` 是否有日志 |
| 6 | 无暴力破解防护 | 1 | 检查 `/auth/login` 限流配置 |
| 7 | 前端无路由守卫 | 1 | 检查 `/admin` 是否对普通用户重定向 |

## 附录 B：Prisma 查询最佳实践

```typescript
// ✅ 安全的分页查询
const items = await prisma.goods.findMany({
  where: { status: 'approved', isDeleted: false },
  select: {
    id: true,
    title: true,
    price: true,
    images: true,
    user: { select: { id: true, nickname: true, avatar: true } },
  },
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});

// ✅ 事务操作
await prisma.$transaction(async (tx) => {
  const goods = await tx.goods.create({ data });
  await tx.auditLog.create({
    data: { action: 'CREATE_GOODS', targetId: goods.id, userId },
  });
  return goods;
});

// ⚠️ 谨慎使用 $queryRaw（必须参数化）
const result = await prisma.$queryRaw<Goods[]>`
  SELECT * FROM Goods WHERE title LIKE ${'%' + keyword + '%'}
`;
// 注意：即使 $queryRaw，也不要把用户输入拼接到 SQL 字符串中
```

---

## 附录 C：Zod 验证 Schema 模板

```typescript
import { z } from 'zod';

// 创建商品 Schema 模板
export const createGoodsSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最长100字'),
  description: z.string().min(1).max(5000),
  price: z.number().min(0).max(999999),
  categoryId: z.number().int().positive(),
  campus: z.enum(['kexue', 'dongfeng']),
  condition: z.enum(['brand_new', 'like_new', 'used', 'old']),
  images: z.array(z.string().url()).min(1).max(9),
  contact: z.string().max(50).optional(),
});

// 查询列表 Schema 模板
export const goodsListQuery = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  campus: z.enum(['kexue', 'dongfeng']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'hot']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  keyword: z.string().max(100).optional(),
});
```

---

> **文档维护**：技术负责人负责每季度审查和更新本文档。
> **反馈渠道**：发现审查标准不合理或有遗漏，请在团队群内提出或提 Issue。
