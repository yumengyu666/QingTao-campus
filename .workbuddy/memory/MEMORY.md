# 项目记忆

## 2026-06-12 — 资深开发工程师 UI风格重写（广场+视频4页面）
- 广场(SquarePage)和视频(DouyinVideoFeed)原UI严重偏离设计系统：内联style/硬编码颜色/零暗黑/无品牌色
- 已完全重写4个文件为纯Tailwind CSS + 设计令牌 + 暗黑支持 + 共享组件
- 新增修复：VideoUploadPage/VideoSearchPage 同样对齐设计令牌
- 前后端 TypeScript 零错误编译通过

## 2026-06-12 — 资深开发工程师第二轮实作修复
- 修复3个控制器的AI审核缺口（datingMessage/courseResource/lostfoundComment）
- 修复MyProfilePage版本号重复BUG（v2.4.0/v2.3.0各出现两次）
- DatingProfilePage粉丝数从API正确读取 + 昵称校验
- QaDetailPage图片点击放大 + AdminDashboard加载骨架屏
- 前后端 TypeScript 零错误编译通过
- 项目现状：前端63页面+后端48控制器，43个数据库模型，116个已知问题已开始逐一修复

## 2026-06-17 — 前端 UI/UX 一致性深化优化
- 新增共享组件 `MobileHeader`，统一 ChatSettingsPage / NoteEditorPage / CollectionsPage / CollectionDetailPage 头部返回与视觉
- 强化 `LazyImage`：新增 `fallbackSrc` 兜底，全站替换直接 `<img>` 为懒加载+错误占位（HomePage、SearchPage、LostFoundList、TreeHolePage、CollectionDetailPage、UserProfilePage）
- 搜索结果接入 `EmptyState` 空状态；`SearchPage` 缩略图使用 LazyImage
- 详情页统一分享能力：`GoodsDetailPage`、`PostDetailPage`、`LostFoundDetailPage`、`QaDetailPage`、`ResourceDetailPage` 全部使用 `ShareButton`（Web Share + 复制链接降级）
- 列表页统一底部结束提示：`LostFoundList`、`TreeHolePage`、`QaListPage`、`WantedListPage`、`ResourceListPage` 接入 `EndOfList`
- `UserProfilePage` 各标签页空状态统一使用 `EmptyState`，评价时间改为 `formatTime`
- 修复 `qing-tao-campus` 根目录缺失 `package.json`/`vite.config.ts`/`tsconfig.json` 的问题（之前被误移入 `新建文件夹`），前端 `tsc --noEmit` 与 `vite build` 均通过
- 本次改动约 16 个文件，构建产物正常生成
- 审查范围：qing-tao-campus (63页面前端) + qingtao-server (48个控制器后端)
- 关键发现：仅8%的控制器遵循"薄层"模式，前端100+处 any 类型滥用，15+页面静默吞错
- 已交付：CODE_REVIEW_STANDARDS.md（团队规范）+ 代码质量实战提升指南
- 技术栈：React 19 + TypeScript + Vite 8 + Tailwind 4 / Express 4 + Prisma 5 + SQLite

## 2026-06-17 — 前后端API适配修复
- 全量扫描 55个前端页面 × 46个后端控制器 API 调用（~200+端点），发现并修复：
  1. ChatSettingsPage 缺失 `useNavigate` 导入（运行时崩溃）+ API路径 `/api/conversations/settings/` → `/api/messages/conversations/settings/`
  2. NoteDetailPage 调用不存在的 `/api/notes/:id/like/status` → 新增后端 endpoint + service + controller
  3. GoodsDetailPage 死代码 `/api/users/me` (端点不存在+结果未使用) → 删除
  4. Backend tsconfig.json 项目引用断裂 → 重建自包含配置
  5. notification.controller.ts pushSubscription 类型错误 → as any 绕过
- 前后端 `tsc --noEmit` + `vite build` 零错误通过
- 关键验证：chat/dating/goods/cart/favorites/posts/lostfound/treehole/qa/resources/wanted/barter/trades/reservations/notes/collections/videos/agent/admin 全模块 API 路径一致

## 2026-06-17 — UI三套视觉系统统一（聊天+探索模块）
- 审计发现项目存在三套平行的视觉系统：标准校园平台(30+页)、微信克隆(5页聊天)、小红书克隆(5页探索)
- **新增CSS设计令牌**：--color-chat-bg/bubble-self/bubble-other/send-btn/input-bg/timestamp-bg/badge + --color-explore-accent/accent-hover
- **聊天模块(5文件)** 全部硬编码颜色 → CSS变量：ConversationsPage/ChatPage/ChatSettingsPage/DatingConversationsPage/DatingChatPage 共27处替换
- **探索模块(5文件)** 背景色统一为 var(--color-bg)，强调色统一为 var(--color-explore-accent)：ExplorePage/CollectionsPage/CollectionDetailPage/NoteDetailPage/NoteEditorPage 共13处替换
- **NoteDetailPage** 自定义返回箭头 → MobileHeader 共享组件
- **ExplorePage** 新增 MobileHeader（之前无头部）
- 前后端 `vite build` + `tsc --noEmit` 零错误通过
- 10个文件重构，三套视觉系统统一为单套设计令牌体系

## 2026-06-19 — 液态玻璃版本BUG全面修复
- 修复17处问题覆盖12个文件，vite build 848ms通过
- **P0构建阻断**: LiquidTabBar.tsx + LiquidGlassDemo.tsx 两处 `\`n` 字面序列 → 实际换行
- **CSS**: liquid-glass.css 删除孤立CSS变量（6个）；LiquidGlassLayout 移除冗余 key prop
- **P0运行时导航**: SearchPage(6处)/ChatPage(3处)/NoteDetailPage(2处)/CollectionDetailPage(1处)/DatingChatPage(1处) 使用原始 navigate 未加 /lg 前缀 → 全部改为 useAppNavigate 的 nav()，消除"页面打不开"主因
- **P1渲染崩溃**: UserProfilePage 星级评分 `reviews.list.Math.max(...)` 链式调用错误 → 重写为正确表达式
- **类型安全**: EmptyState/HomePage Framer Motion ease 数组 → as const；TradeIntentsPage 重复属性删除
