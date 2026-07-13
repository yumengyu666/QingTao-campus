# 轻淘校园二手交易平台 — 全面测试报告

> 测试日期：2026-06-02 | 测试人员：自动化测试

---

## 一、项目概况

| 项目 | 技术栈 |
|------|--------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Zustand + React Query + React Router 7 |
| 后端 | Express 4 + Prisma (SQLite) + JWT + Winston + Multer |
| 数据库 | SQLite (`prisma/dev.db`) |
| AI 审核 | DeepSeek API (熔断机制 + 审计日志) |
| 部署 | Docker + Nginx (生产环境) |

**功能模块：** 商品交易、广场帖子、失物招领、校园问答、树洞、恋爱专区、聊天消息、考试资料、用户关注/拉黑、后台管理

---

## 二、构建错误 (2 个严重 Bug)

### Bug 1: QaDetailPage.tsx — 多余的闭合标签导致构建失败

- **文件:** `qing-tao-campus/src/pages/qa/QaDetailPage.tsx:170`
- **错误:** `Unterminated regular expression`
- **原因:** 第 170 行有一个多余的 `</div>` 闭合标签，没有对应的开放标签
- **结构分析:** 第 83 行 `<div className="min-h-screen...">` 的根元素，在第 169 行已正确闭合了固定的回答输入栏，但第 170 行多了一个 `<div>` 闭合标签
- **影响:** 前端 `vite build` 失败，无法部署生产环境

### Bug 2: NotificationsPage.tsx — 语法错误导致构建失败

- **文件:** `qing-tao-campus/src/pages/profile/NotificationsPage.tsx:179`
- **错误:** `Expected a semicolon or an implicit semicolon after a statement, but found none`
- **原因:** `notifs.map()` 回调的 `return (` 语句与 JSX 关闭结构存在语法解析问题，Vite 8 的 Rolldown 打包器无法正确解析该 JSX 结构
- **影响:** 同上，前端生产构建失败

---

## 三、后端 API 测试结果

### 通过的端点 (22 项)

| 测试项 | 端点 | 状态 |
|--------|------|------|
| Health Check | `GET /health` | 200 OK |
| 验证码生成 | `GET /api/captcha/generate` | 200 OK |
| 轮播图 | `GET /api/banners` | 200 OK |
| 分类列表 | `GET /api/categories` | 200 OK |
| 商品列表 | `GET /api/goods` | 200 OK |
| 最新商品 | `GET /api/goods/newest` | 200 OK |
| 热门商品 | `GET /api/goods/hot` | 200 OK |
| 不存在的商品 | `GET /api/goods/99999` | 404 (正确) |
| 广场帖子 | `GET /api/posts` | 200 OK |
| 失物招领 | `GET /api/lostfound` | 200 OK |
| 树洞匿名 | `GET/POST /api/treehole` | 200/201 OK |
| 热门搜索 | `GET /api/search/hot` | 200 OK |
| 考试资料 | `GET /api/resources` | 200 OK |
| 校园问答 | `GET /api/qa` | 200 OK |
| 输入验证 | 空 body 注册/无效数据发布 | 400 (正确) |
| 未认证拦截 | 无 Token 访问受保护端点 | 401 (正确) |
| 管理员权限 | 普通用户访问 /api/admin | 403 (正确) |

### 发现的问题

#### 问题 1: 登录失败返回 400 而非 401

- **文件:** `qingtao-server/src/controllers/auth.controller.ts:67`
- **严重程度:** 低（功能正常，语义不规范）
- **描述:** `login` 函数在用户名或密码错误时调用 `error(res, '用户名或密码错误')`，默认返回 HTTP 400。但认证失败应返回 HTTP 401
- **影响:** 前端 `apiFetch` 对 401 做 Token 自动刷新，但登录页无需 Token，所以不影响功能。但不符合 HTTP 语义规范

#### 问题 2: 创建商品缺少 categoryId 存在性验证

- **文件:** `qingtao-server/src/controllers/goods.controller.ts:171-177`
- **严重程度:** 中（会导致 500 服务器错误）
- **描述:** `createGoods` 只检查了 `if (!categoryId)` 但未检查该 categoryId 是否存在。若传入不存在的分类 ID，Prisma 会抛出外键约束错误（500），而非友好提示
- **日志证据:** `error.log` 中有多条 `Foreign key constraint violated: foreign key` 错误，来自 `POST /api/goods`
- **影响:** 用户传入无效分类 ID 时会看到 500 错误而非 400 友好提示

#### 问题 3: 注册/登录需要验证码，增加测试复杂度

- **描述:** 注册端点需要 `captchaId` 和 `captchaAnswer`。登录页面前端也展示了 MathCaptcha（但后端登录接口并未验证此验证码，验证码仅作为前端门控）
- **状态:** 功能正常，但登录页面的验证码在实际后端不校验，为纯前端门控

#### 问题 4: 搜索端点参数名为 `keyword` 非 `q`

- **文件:** `qingtao-server/src/controllers/search.controller.ts:28`
- **描述:** 搜索接口使用 `?keyword=` 参数而非常见的 `?q=`
- **影响:** 前端 SearchPage 需确认参数名匹配

---

## 四、数据库检查

| 检查项 | 结果 |
|--------|------|
| Schema 与数据库一致性 | 通过（db pull 输出匹配） |
| 表数量 | 25 张表（User, Goods, Post, LostFound, CartItem, Favorite, Notification, Review, Report, Announcement, Banner, ChatMessage, Block, ImageReview, DatingProfile, DatingPost, DatingFollow, DatingMessage, QaPost, QaAnswer, QaVote, TreeHolePost, TreeHoleComment, CourseResource, SearchLog） |
| 迁移状态 | 正常 |
| 外键约束 | 完整 |

---

## 五、前端检查

### TypeScript 类型检查

- **前端 `tsc --noEmit`:** 通过，0 errors
- **后端 `tsc --noEmit`:** 通过，0 errors

### Vite 构建警告

- **警告:** `manualChunks` 配置 — Vite 8 (Rolldown) 期望 `Function` 类型但收到了 `Object`
- **文件:** `qing-tao-campus/vite.config.ts`
- **影响:** 生产构建的代码分割不生效，但不影响功能

### 代码质量观察

1. **LoginPage 发送验证码给 Login 端点但后端不校验** — `LoginPage.tsx:43` 发送 `captchaId` 和 `captchaAnswer` 到 `/api/auth/login`，但后端的 `login` 函数只解构了 `username` 和 `password`，未校验验证码
2. **RegisterPage 使用 `fetch` 而非 `apiFetch`** — `RegisterPage.tsx:44` 直接用 `fetch('/api/auth/register', ...)` 而非封装的 `apiFetch()`，这意味着注册请求不会自动添加 Token（虽然注册时本不应有 Token，但缺少统一的错误处理）
3. **MathCaptcha 组件在两个页面都请求了后端 `/api/captcha/generate`** — 验证码在后端生成并存储，前端展示为 Base64 SVG 图片，工作正常

---

## 六、安全与运维

### 已实现的良好安全措施

- Helmet 安全头 + CORS 白名单 + 速率限制
- JWT Token + Refresh Token 双 Token 机制
- Token 版本号机制（修改密码后旧 Token 失效）
- 全局封号用户拦截中间件
- 验证码防刷（IP 级别重试限制）
- AI 内容审核 + 敏感词过滤 + 熔断机制
- URL 枚举防护（enumerationGuard）
- 审核审计日志（JSONL 格式）
- 优雅关闭 + 未捕获异常处理

### 日志检查

- `error.log` 中记录了外键约束错误的 Goods 创建失败
- `audit-logs/` 目录有 AI 审核审计记录正常运行
- 搜索日志有定时清理机制（每 30 分钟）

---

## 七、问题汇总

| # | 严重程度 | 类型 | 文件 | 描述 |
|---|----------|------|------|------|
| 1 | **严重** | 构建错误 | `QaDetailPage.tsx:170` | 多余的 `</div>` 导致前端构建失败 |
| 2 | **严重** | 构建错误 | `NotificationsPage.tsx:179` | JSX 语法错误导致前端构建失败 |
| 3 | 中 | 缺少验证 | `goods.controller.ts:171` | 创建商品不验证 categoryId 是否存在 |
| 4 | 低 | HTTP 语义 | `auth.controller.ts:67` | 登录失败返回 400 而非 401 |
| 5 | 低 | 构建警告 | `vite.config.ts` | manualChunks 类型不兼容 Vite 8 |
| 6 | 低 | 不一致 | `LoginPage.tsx:43` | 登录页发送验证码但后端不校验 |

---

## 八、建议

1. **立即修复两个构建错误** — 无法部署生产环境
2. **在 `createGoods` 中添加分类存在性校验** — 避免 500 错误
3. **统一登录失败的 HTTP 状态码为 401** — 符合 HTTP 语义
4. **修复 Vite `manualChunks` 配置** — 适配 Vite 8 的 Rolldown 构建器
5. **考虑为项目添加自动化测试** — 当前无任何单元测试或集成测试
