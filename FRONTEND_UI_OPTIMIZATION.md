<!--
  青桃校园 · 前端 UI 全面优化建议
  生成时间：2026-06-17
  范围：仅前端（不涉及后端/数据库/API）
  基于：ISSUES.md（116 项）+ ISSUES_VERIFY_REPORT.md + 源码审查
  状态：P0 100%修复 / P1 94%修复 / P2 8%修复
-->

# 青桃校园 · 前端 UI 全面优化建议

> P0 安全缺口已全部闭合，P1 体验硬伤收至 94%。本建议聚焦 **P2 优化项** 和源码审查中发现的 **增量 UI 问题**，按用户可感知的影响程度分级。

---

## 优先级速览

| 级别 | 项数 | 含义 |
|------|------|------|
| 🔴 高 | 12 项 | 每日使用中高频碰到，修复后用户体感显著提升 |
| 🟡 中 | 14 项 | 特定场景下痛点明显，按节奏推进 |
| 🟢 低 | 14 项 | 锦上添花，长期质量投资 |

---

## 🔴 高优先级（12 项）

### 1. 搜索体验升级

**涉及文件**: `pages/search/SearchPage.tsx`、`pages/goods/GoodsListPage.tsx`

**现状**：
- 搜索仅支持商品，不能搜帖子/失物招领/答疑内容（ISSUES #48）
- 搜索关键词无历史记录，每次重新输入（ISSUES #47）
- 搜索结果无类型筛选 Tab，商品和帖子混在一起（ISSUES #50）
- 搜索大小写敏感，"iphone" 搜不到 "iPhone"（ISSUES #49）

**建议**：
1. `SearchPage.tsx` 新增 Tab 栏：`全部 | 商品 | 帖子 | 失物招领 | 答疑`，点击切换时追加 `?type=`
2. 添加 `searchHistory` 到 `localStorage`（最大 10 条），搜索框获得焦点时展示历史列表，点击可快速填入
3. 搜索 API 请求前对 keyword 做 `.toLowerCase()` 前端预处理（后端同步改更好，但前端先兜底）
4. 搜索输入防抖 300ms（避免每次按键发请求），当前已有防抖但需确认是否生效

---

### 2. 通知中心展示优化

**涉及文件**: `pages/profile/NotificationsPage.tsx`

**现状**：
- 通知列表超过一定字数直接截断（ISSUES #80），看不到关键信息
- 通知中不显示具体对象名（ISSUES #33 部分修复）：评论通知有 snippet 但售出通知无商品名
- 无通知偏好设置（ISSUES #71），所有通知类型一视同仁

**建议**：
1. 通知卡片改为最多 3 行自动省略，保留"查看详情"链接；标题行永远完整显示
2. 在通知卡片上增加 `<span className="text-xs text-gray-400">商品：{goodsTitle}</span>` 展示关联对象
3. 在 `NotificationsPage` 顶部增加偏好入口：`[通知设置]` → 弹出 Modal，可勾选：
   - 评论通知
   - 点赞通知
   - 交易通知
   - 系统通知
   - AI 审核通知
   - 私信通知（跳转消息页设置）
   - 恋爱互动通知
   存储到 `localStorage` key `notification_prefs`，前端渲染时据此过滤列表

---

### 3. 聊天搜索 & 翻页方向改进

**涉及文件**: `pages/chat/ChatPage.tsx`（37569 行超大文件）、`components/chat/ChatSearchPanel.tsx`

**现状**：
- 聊天不支持消息搜索（ISSUES #76）：`ChatSearchPanel` 组件已创建但未深度集成
- 聊天翻页体验差（ISSUES #77）：加载更多按钮在消息列表最上面，不符合微信式聊天习惯
- `ChatPage.tsx` 体积 37KB+，状态逻辑和 UI 渲染高度耦合

**建议**：
1. 强化 `ChatSearchPanel` 集成：
   - 顶部搜索栏输入关键词 → 前端过滤当前已加载的消息（`content.includes(keyword)`）
   - 搜索结果高亮关键词 + 点击跳转到该条消息位置
   - 如需搜索更多历史消息：加 "搜索更早记录" 按钮，触发后端搜索 API
2. 修改翻页方向：加载更多按钮移到列表 `顶部` → 改为在列表底部显示"下拉加载更多"，或直接在列表底部自动触发（IntersectionObserver）
3. `ChatPage.tsx` 建议拆分为多个子组件（已在 v3.0 计划中，预估工作量 3-4h）：
   - `ChatHeader`（导航栏：返回+昵称+菜单）
   - `ChatMessageList`（消息列表：虚拟滚动 + 时间分割线）
   - `ChatInputBar`（底部输入区：文字/图片/语音/表情）

---

### 4. 图片上传进度条 & 拖拽排序

**涉及文件**: `components/common/ImageUploader.tsx`（10017 行）

**现状**：
- 上传大图干等数秒，无进度反馈（ISSUES #51）
- 多图上传后无法调顺序（ISSUES #52）
- `ImageUploader` 已具备基础功能但缺进度和排序

**建议**：
1. 使用 `XMLHttpRequest.upload.onprogress` 或 `fetch` + `ReadableStream` 获取上传进度
   ```tsx
   // 伪代码
   const xhr = new XMLHttpRequest();
   xhr.upload.onprogress = (e) => setProgress(Math.round((e.loaded / e.total) * 100));
   ```
2. 每张图片卡片上叠加进度条 `<div className="absolute bottom-0 left-0 h-1 bg-indigo-500" style={{width:`${progress}%`}}/>`
3. 拖拽排序：引入轻量库 `@dnd-kit/core` + `@dnd-kit/sortable`（~5KB gzip），或手写原生 Drag & Drop
   - 图片卡片加 `draggable` + `onDragStart/onDragOver/onDragEnd`
   - 拖拽过程中显示半透明占位 + 被拖拽项浮起阴影

---

### 5. ISO 时间戳 → 相对时间（全站排查）

**涉及文件**: 各页面中直接渲染 `item.createdAt` 的位置

**现状**：
- `utils/format.ts` 已有 `formatTime`、`formatRelativeTime`、`formatChatTime` 三个函数
- 但部分页面仍直接将 ISO 字符串渲染到界面上（ISSUES #54）

**建议**：
1. 全站 `rg` 搜索 `{item.createdAt}`、`{post.createdAt}`、`{comment.createdAt}` 等直接渲染
2. 替换为 `{formatTime(item.createdAt)}` 或 `{formatRelativeTime(item.createdAt)}`
3. 优先修复以下高频页面：
   - `pages/goods/GoodsDetailPage.tsx` — 评论列表时间
   - `pages/treehole/TreeHolePage.tsx` — 评论时间
   - `pages/square/PostDetailPage.tsx` — 评论时间
   - `pages/qa/QaDetailPage.tsx` — 回答时间

---

### 6. 移动端键盘遮挡输入框

**涉及文件**: `hooks/useKeyboardAvoid.ts`、各页面底部输入区

**现状**：
- Issue #56：底部导航栏被键盘顶上，发评论/私信时看不到输入内容
- `useKeyboardAvoid` hook 已写但可能未在所有页面中正确调用

**建议**：
1. 确保所有含底部输入区的页面使用 `useKeyboardAvoid`：
   - `ChatPage.tsx`
   - `DatingChatPage.tsx`
   - `PostDetailPage.tsx`
   - `GoodsDetailPage.tsx`
   - `TreeHolePage.tsx`
   - `QaDetailPage.tsx`
   - `LostFoundDetailPage.tsx`
2. `useKeyboardAvoid` 监听 `visualViewport.resize` 事件，动态调整 `padding-bottom` 或 `transform`
3. iOS Safari 特殊处理：`document.body.scrollIntoView({block:'center'})` 在 input focus 时调用

---

### 7. 移动端弹窗过大 + 关闭按钮难触达

**涉及文件**: `components/ui/Modal.tsx`、各页面中的 modal 使用

**现状**：
- Issue #57：恋爱请求弹窗等在手机上特别大，关闭按钮在左上角，单手够不到

**建议**：
1. `Modal.tsx` 增加 `bottomSheet` 属性：移动端（`<640px`）自动切换为底部弹出面板
   ```tsx
   // 判断逻辑
   const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
   // mobile: fixed bottom-0 rounded-t-2xl max-h-[85vh] overflow-y-auto
   // desktop: fixed center rounded-2xl max-h-[80vh] max-w-lg
   ```
2. 底部面板模式：关闭按钮移到右上角 + 增加顶部灰色拖拽条作为视觉提示
3. 关键弹窗列表（逐一排查）：
   - 恋爱请求弹窗
   - 发布 Modal（`PublishModal.tsx`）
   - 确认弹窗（`ConfirmModal.tsx`）
   - 举报弹窗

---

### 8. 购物车列表增加快捷联系入口

**涉及文件**: `pages/cart/CartPage.tsx`

**现状**：
- Issue #60：购物车只能看加购商品，想联系卖家还得点回商品详情页

**建议**：
1. 每行增加 `[联系卖家]` 按钮 → `navigate(/messages/${item.userId})`
2. 增加 `[查看商品]` 按钮 → `navigate(/goods/${item.goodsId})`
3. 三种操作并排：`勾选/取消 | 联系卖家 | 查看详情 | 删除`

---

### 9. 分类筛选不支持取消选中

**涉及文件**: `pages/goods/GoodsListPage.tsx`、`pages/home/HomePage.tsx`、其他含分类筛选页

**现状**：
- Issue #62：选中一个分类后无法取消回到"全部"，必须找到"全部"标签点击

**建议**：
1. 再次点击已选中的分类标签 → `setActiveCategory(0)` / `setActiveCategory('')`
2. "全部"标签始终显示在最左侧，且使用不同视觉样式（outline 风格 vs 填充风格）
3. 这是一个低成本高触达的改进（修改 1-2 行逻辑 + 3-4 行样式）

---

### 10. 卖家名片：增加"查看卖家其他商品"入口

**涉及文件**: `pages/goods/GoodsDetailPage.tsx`、`pages/profile/UserProfilePage.tsx`

**现状**：
- Issue #78：买家和卖家沟通时想看他还有什么在卖，要去主页手动翻
- `UserProfilePage` 虽可查看但入口不明显

**建议**：
1. 在 `GoodsDetailPage` 卖家信息区增加 `[查看Ta的全部商品]` 链接
   ```tsx
   <button onClick={() => navigate(`/goods?userId=${goods.userId}`)}>
     查看Ta的全部商品 →
   </button>
   ```
2. 商品列表页 `GoodsListPage` 增加 `userId` 查询参数支持（目前可能已支持，需确认）

---

### 11. 无限滚动列表底部结束提示

**涉及文件**: `components/common/EndOfList.tsx`（已存在）、各列表页

**现状**：
- Issue #79：首页下拉到底无提示，用户不知道已加载完
- `EndOfList` 组件已创建但可能未被广泛使用

**建议**：
1. 排查并添加 `<EndOfList>` 到以下页面的列表底部：
   - `HomePage` — 最新/热门 Tab 底部
   - `GoodsListPage` — 如使用分页则在最后一页底部显示
   - `ExplorePage` — 瀑布流底部
   - `TreeHolePage` — 帖子列表底部
   - `SquarePage` — 瀑布流底部
2. `EndOfList` 显示文案："—— 你已经看到底啦 ——" / "没有更多了" + 酌情加个轻松图标

---

### 12. 图片 Lightbox 全屏浏览增强

**涉及文件**: `components/common/ImageLightbox.tsx`（已存在）、`LazyImage.tsx`

**现状**：
- `ImageLightbox` 组件已存在，但各详情页点击图片不一定会触发全屏浏览
- Issue #53 部分修复

**建议**：
1. 确保以下页面的图片点击触发 Lightbox：
   - `GoodsDetailPage.tsx` — 商品图片
   - `PostDetailPage.tsx` — 帖子图片
   - `ExplorePage.tsx` — 笔记封面
   - `NoteDetailPage.tsx` — 笔记图片
   - `ResourceDetailPage.tsx` — 资料预览图
2. Lightbox 内支持：
   - 双指缩放（pinch zoom）+ PC 滚轮缩放
   - 左右箭头或滑动切换多图
   - 当前图序号指示器（"2/5"）

---

## 🟡 中优先级（14 项）

### 13. 公告用户端可见

**涉及文件**: `pages/home/HomePage.tsx`、通知中心

**现状**：
- Issue #66：管理员发了公告，普通用户在首页/通知中心看不到
- `HomePage` 已有 `announcements` state 和 `fetchAnnouncements` 逻辑，但入口不明显

**建议**：
1. 首页顶部轮播下方增加 `[公告栏]` 横条：图标 + 第一条公告标题 + "查看全部→"
2. 通知中心增加 `系统通知` Tab，公告归入其中
3. 新公告发布时在顶部短暂显示 3 秒 banner（不阻断操作）

---

### 14. 表单草稿自动保存

**涉及文件**: `hooks/useDraft.ts`（已存在）、各发布页面

**现状**：
- Issue #69：手机切后台再回来页面刷新，填了一半的内容丢失
- `useDraft` hook 已创建但可能在部分页面未接入

**建议**：
1. 确保以下页面接入 `useDraft`：
   - `PublishGoodsPage.tsx` → key: `draft_goods`
   - `PublishPostPage.tsx` / `NoteEditorPage.tsx` → key: `draft_post`
   - `PublishLostFoundPage.tsx` → key: `draft_lostfound`
   - `PublishWantedPage.tsx` → key: `draft_wanted`
   - `TreeHolePage` 发帖输入 → key: `draft_treehole`
2. `useDraft` 存储到 `sessionStorage`（关闭标签页即清除）或 `localStorage`（带 24h 过期）
3. 用户进入编辑页时检测草稿 → 弹 toast："检测到未完成的草稿，已自动恢复"
4. 发布成功后清除对应的 draft key

---

### 15. 价格筛选输入格式校验

**涉及文件**: `pages/goods/GoodsListPage.tsx`

**现状**：
- Issue #63：价格输入"abc"无校验提示，结果变空
- 已部分修复（`priceError` state 存在）但需验证覆盖范围

**建议**：
1. `onChange` 中限制只能输入数字和小数点：`e.target.value.replace(/[^0-9.]/g, '')`
2. 失焦时校验：最小值 > 最大值时 `setPriceError('最低价不能大于最高价')`
3. 提交筛选时前端拦截非法输入，不发起 API 请求

---

### 16. 我的商品/帖子增加搜索筛选栏

**涉及文件**: `pages/profile/MyGoodsPage.tsx`、`pages/profile/MyPostsPage.tsx`

**现状**：
- Issue #64：历史记录多时只能一页一页翻，无法搜索或筛选

**建议**：
1. 页面顶部增加简单搜索栏（`input + onInput 300ms 防抖`）
2. 前端过滤：`items.filter(i => i.title.includes(keyword))`
3. 如果数据量大需后端分页搜索，则加 API 参数 `?keyword=`

---

### 17. 举报处理结果反馈

**涉及文件**: 各举报弹窗调用处

**现状**：
- Issue #65：提交举报后只有 toast "举报成功"，不知道平台是否处理

**建议**：
1. 通知系统增加 `report_result` 类型通知
2. 管理员处理后推送通知给举报人："你在 [商品名] 的举报已被 [处理结果]"
3. 短期替代：前端在通知列表显示一个 `处理中` 标记，让用户知道被受理了

---

### 18. 校区字段显示统一为中文

**涉及文件**: `utils/constants.ts` 中的 `CAMPUS_MAP`、各列表/详情页

**现状**：
- Issue #73：个人资料选"科学校区""东风校区"，商品发布页面个别地方显示拼音
- `CAMPUS_MAP` 已定义映射，但部分组件可能直接渲染了原始值

**建议**：
1. `rg` 全站搜索 `kexue`、`dongfeng` 字符串 → 替换为 `CAMPUS_MAP[value]` 或 `{value === 'kexue' ? '科学校区' : '东风校区'}`
2. 创建一个 `<CampusTag>` 组件统一渲染校区标签（已存在 `components/common/CampusTag.tsx`，确保全面使用）

---

### 19. 昵称修改不同步历史内容

**涉及文件**: 所有渲染 `item.user?.nickname` 的位置

**现状**：
- Issue #75：改昵称后旧聊天记录和评论里还是旧昵称，同一段对话里称呼不一致
- 这是后端数据设计问题（nickname 存的是快照），但前端可以优化体验

**建议**：
1. 在聊天页和评论列表中，对于当前登录用户自己的消息，使用 `authStore.user.nickname` 而非消息中存储的旧昵称
2. 其他人的昵称保持数据原样（无法区分是否改名）
3. 用户修改昵称后，前端在 `authStore` 中更新 + `localStorage` 刷新

---

### 20. 考试资料增加编辑 & 预览

**涉及文件**: `pages/resources/ResourceDetailPage.tsx`（12941 行）

**现状**：
- Issue #68：上传后发现文件名写错，不能修改
- 上传前无预览确认

**建议**：
1. `ResourceDetailPage` 增加 `[编辑]` 按钮（仅作者可见）→ 弹出编辑 Modal：修改标题/描述/分类
2. 上传页面 `PublishResourcePage`（如存在）增加预览步骤：上传文件后展示文件名、大小、类型，点"确认上传"
3. 调用 `PUT /api/resources/:id` 接口（需后端配合）

---

### 21. 恋爱私聊与普通私聊统一入口

**涉及文件**: `pages/dating/DatingChatPage.tsx`、`pages/chat/ChatPage.tsx`、`pages/chat/ConversationsPage.tsx`

**现状**：
- Issue #67：恋爱区私聊和"消息"页是两套独立系统，同一个人两边聊天记录互不相通
- 用户困惑：给同一个人发消息，到底去哪个页面？

**建议**：
1. 在 `ConversationsPage` 统一列表中合并普通私聊 + 恋爱私聊（加 Tab 或标签区分）
2. 恋爱私聊入口保留在 DatingSquare 内，但点击后跳转到统一的 `ChatPage`（带 dating 上下文）
3. 聊天页面顶部显示恋爱关系状态（`💕 恋爱中`），与非恋爱聊天视觉上有区分

---

### 22. 关注系统统一（广场 + 恋爱）

**涉及文件**: profile 相关关注页面、dating 关注逻辑

**现状**：
- Issue #70：在广场关注了一个人，去恋爱区还显示"未关注"。两套关注系统独立

**建议**：
1. 统一使用一套关注 API（后端已可能有 `POST /api/users/:id/follow`）
2. 前端 `FollowButton` 组件读取统一的 `isFollowing` 状态（从 `GET /api/users/:id` 或全局 `followStore`）
3. 前端关注状态用 `useSWR` 或统一的 store 管理，避免不同页面重复请求

---

### 23. 购物车去重提示优化

**涉及文件**: `pages/cart/CartPage.tsx`、`pages/goods/GoodsDetailPage.tsx`

**现状**：
- Issue #20 已修复（后端去重），但前端体验可优化

**建议**：
1. 商品已在购物车中时，按钮文案改为 `✓ 已加入购物车` + 置灰
2. 或改为 `已在购物车 (查看→)`，点击跳转购物车
3. `GoodsDetailPage` 在进入时检查该商品是否在购物车中（`GET /api/cart` 本地缓存）

---

### 24. 图片加载失败占位图统一

**涉及文件**: `components/common/LazyImage.tsx`、各页面内 `<img>` 标签

**现状**：
- Issue #59 部分修复，但部分页面仍有直接 `<img src={url}>` 而未用 `LazyImage` 或未处理 `onError`

**建议**：
1. 全站 `rg` 搜索 `<img ` → 排查是否都用了 `LazyImage` 组件或至少有 `onError` 处理
2. `onError` 回调：`e.currentTarget.src = '/logo.png'`（使用项目本地占位图）
3. `LazyImage` 增加 `fallback` prop，默认值为 `'/logo.png'`
4. 占位图使用 80px × 80px 的 CSS 灰色背景 + 图标（不依赖网络加载）

---

### 25. 资源详情页增加评价 & 举报

**涉及文件**: `pages/resources/ResourceDetailPage.tsx`

**现状**：
- Issue #41：仅支持下载/点赞，无评论和举报
- 验证报告标记为未修复

**建议**：
1. 增加评论输入框 + 评论列表（复用 `PostDetailPage` 的评论逻辑）
2. 增加举报按钮 → 弹出举报 Modal（复用其他页面的举报组件）
3. 评分组件如果用不上（评价数量少），用简单的 `👍有用` / `👎没用` 替代

---

### 26. 分享功能（复制链接 + 生成分享图）

**涉及文件**: `components/common/ShareButton.tsx`（已存在）

**现状**：
- Issue #84：无分享功能，内容传播全靠截图
- `ShareButton` 组件已存在但需检查集成了哪些页面

**建议**：
1. 确保以下页面有 `ShareButton`：
   - `GoodsDetailPage.tsx`
   - `PostDetailPage.tsx` / `NoteDetailPage.tsx`
   - `LostFoundDetailPage.tsx`
   - `TreeHolePage` — 单条帖子
   - `ExplorePage` — 笔记卡片
2. `ShareButton` 功能：
   - `[复制链接]` → `navigator.clipboard.writeText(window.location.href)`
   - `[生成分享图]` → 使用 `html2canvas`（~30KB）或手写 Canvas 生成带标题+二维码的分享图
   - 优先实现复制链接（零依赖）

---

## 🟢 低优先级（14 项）

### 27. 富文本输入（Markdown 或 基础格式）

**涉及文件**: 所有内容发布页

**现状**：
- Issue #82：所有内容都是纯文本，无加粗、分段、列表

**建议**：
1. 引入轻量 Markdown 编辑器（如 `@uiw/react-md-editor` ~50KB gzip 或 `milkdown` ~40KB）
2. 低影响替代：支持 `**加粗**`、`*斜体*`、换行转 `<br>`，预览时渲染
3. 添加字数计数器：`{text.length}/500` 显示在输入框右下角
4. 优先在帖子和笔记编辑器上应用（商品描述保持简单）

---

### 28. 排行榜 / 达人标识

**涉及文件**: `pages/home/HomePage.tsx`、`pages/explore/ExplorePage.tsx`

**现状**：
- Issue #81：无活跃用户排行、交易达人、恋爱区人气等

**建议**：
1. 首页侧边栏或 Explore 页增加一个 `[本周活跃榜]` 组件：
   - 展示 Top 10 活跃用户（头像 + 昵称 + 热度值）
   - 热度 = 发帖数 + 评论数 + 交易数 的综合指标
2. 用户头像旁显示达人徽章：
   - 🛒 交易达人（> 10 笔交易）
   - ✍️ 内容达人（> 20 篇帖子）
   - 💬 评论达人（> 50 条评论）
3. 保守推进：先用前端 mock 数据验证 UI，确认有用户需求后再接后端 API

---

### 29. 数学验证码重试限制

**涉及文件**: `components/common/MathCaptcha.tsx`

**现状**：
- Issue #46：验证码答错可无限重试

**建议**：
1. 添加错误计数器：连续错误 3 次后禁用 30 秒 + 显示倒计时
2. 每 3 次错误后刷新题目（生成新的算式）
3. 存储错误计数到组件 state（不持久化，刷新页面重置）

---

### 30. 全局 Loading 骨架屏覆盖

**涉及文件**: `components/common/Skeleton.tsx`、各列表页

**现状**：
- `Skeleton` 组件已完善（10 种 variants），但部分页面仍用简单 loading spinner

**建议**：
1. 统一 loading 策略：
   - 首次加载：显示 `Skeleton.Grid` 或 `Skeleton.List`（骨架屏）
   - 后续翻页/筛选：显示底部小型 spinner（不闪烁全页）
   - 空数据：显示 `EmptyState`（已实现但需覆盖全页面）
2. 排查并替换还在用 `<div>加载中...</div>` 的页面为 `<Skeleton>`

---

### 31. 深色模式全局一致性审查

**涉及文件**: 所有 CSS / 组件

**现状**：
- 设计系统支持 7 种主题 + 深色模式
- 部分页面组件使用硬编码颜色（如 `bg-white`、`text-gray-900`）而非设计令牌

**建议**：
1. 全站 `rg` 搜索硬编码颜色：`bg-white`、`bg-gray-50`、`text-gray-900`、`text-black` → 替换为设计令牌
2. 优先修复：Modal 背景、卡片背景、输入框边框
3. 使用 `dark:` 前缀处理深色模式（`dark:bg-[var(--color-card)]`）
4. 用 Playwright 截图对比 light/dark 模式各页面

---

### 32. Toast 通知统一管理

**涉及文件**: `utils/toast.ts`（新建）、各页面 `toast.success/error`

**现状**：
- 使用 `react-hot-toast`，但各处调用分散
- 部分 toast 闪过即灭，无持续时间设置
- 无全局 toast 样式定制

**建议**：
1. 创建 `utils/toast.ts` 封装：
   ```ts
   export const showSuccess = (msg: string) => toast.success(msg, { duration: 2000 });
   export const showError = (msg: string) => toast.error(msg, { duration: 3000 });
   export const showLoading = (msg: string) => toast.loading(msg);
   ```
2. 统一 `duration`：成功 2s、错误 3s、加载中直至手动 dismiss
3. 替换所有直接 `toast.success(...)` 调用为统一封装

---

### 33. 网络状态提示优化

**涉及文件**: `components/common/NetworkStatus.tsx`

**现状**：
- Issue #32 已修复（离线白屏有提示）
- `NetworkStatus` 已创建但体验可优化

**建议**：
1. 网络恢复时自动重试当前页面数据：`NetworkStatus` 检测到 `online` 事件 → 触发全局 `refetch` 事件
2. 离线时在顶部显示固定条（非模态弹窗）："当前处于离线状态，部分功能不可用"
3. 弱网（`navigator.connection?.effectiveType === 'slow-2g'`）时降低图片质量为缩略图

---

### 34. 页面标题动态更新

**涉及文件**: `hooks/useTitle.ts`（已存在）、各页面

**现状**：
- `useTitle` 已存在但使用不全面

**建议**：
1. 确保每个页面调用 `useTitle`：
   - 首页 → `轻淘 - 郑轻校园`
   - 商品详情 → `轻淘 - ${goods.title}`
   - 个人主页 → `轻淘 - ${user.nickname}`
2. 路由配置中添加 `title` 字段，用路由中间件自动设置

---

### 35. 移动端商品图片全宽显示

**涉及文件**: `pages/goods/GoodsDetailPage.tsx`

**现状**：
- Issue #58：商品详情页图片在手机上只有一半宽度

**建议**：
1. GoodsDetailPage 图片区：移动端 `w-full`（全宽）、PC 端 `max-w-lg mx-auto`（居中限宽）
2. 确保 `object-fit: contain` 或 `cover` 适配图片比例

---

### 36. 动态 favicon 通知红点

**涉及文件**: `index.html`、`utils/favicon.ts`（新建）

**现状**：
- 无 favicon 红点，用户切到其他 Tab 后不知道有新消息

**建议**：
1. 利用 `document.title` 轮询 + 未读计数 → `(3) 轻淘 - 郑轻校园`
2. Canvas 动态生成带红点数字的 favicon：
   ```ts
   const canvas = document.createElement('canvas');
   canvas.width = 32; canvas.height = 32;
   const ctx = canvas.getContext('2d');
   // 绘制原 favicon + 红点 + 数字
   const link = document.querySelector('link[rel="icon"]');
   link.href = canvas.toDataURL();
   ```

---

### 37. 页面切换过渡动画一致性

**涉及文件**: `components/common/PageTransition.tsx`、`router/index.tsx`

**现状**：
- `PageTransition` 存在但可能不是所有路由都用

**建议**：
1. 在路由配置层包裹 `PageTransition` 到所有路由
2. 统一入场动画：`fadeInUp` + 0.2s duration（保持轻快感）
3. 尊重 `prefers-reduced-motion` 用户偏好（跳过动画）

---

### 38. 消除生产环境 console.log

**涉及文件**: `vite.config.ts`、各页面

**现状**：
- Issue #72 部分修复，但 F12 仍可见调试日志

**建议**：
1. `vite.config.ts` 中配置 `esbuild.drop: ['console', 'debugger']` 在生产构建时移除
2. 开发环境保留，生产环境使用自定义 `logger`（仅在 `import.meta.env.DEV` 时输出）

---

### 39. 无障碍补充 (ARIA labels + 键盘导航)

**涉及文件**: 全局组件

**现状**：
- `accessibility.css` 已覆盖基础规范
- 部分交互元素缺少 `aria-label`

**建议**：
1. 所有纯图标的按钮添加 `aria-label`（例如：`<button aria-label="点赞">`）
2. 弹窗增加 `role="dialog"` + `aria-modal="true"`
3. Tab 切换支持左右箭头键导航
4. 使用 `axe-core` 或 Chrome Lighthouse 扫描当前页面无障碍得分

---

### 40. 移动端底部导航栏优化

**涉及文件**: `components/layout/SideNav.tsx`

**现状**：
- 移动端底部 tab 5项（首页/广场/淘货/消息/我的）

**建议**：
1. 增加 `购物车` 入口到移动端底部（6 项略多，可合并 `淘货` + `购物车` 为一个入口，内部 Tab 切换）
2. 当前所在页面的 Tab 图标高亮 + 底部指示条动画
3. 消息 Tab 红点逻辑确保实时更新（当前已有 15s 轮询，但可加强 WebSocket 推送）

---

## 附录 A：各页面待优化清单（快速索引）

| 页面 | 优先级 | 关键优化项 |
|------|--------|-----------|
| `SearchPage.tsx` | 🔴 | 搜索历史、类型筛选、大小写 |
| `NotificationsPage.tsx` | 🔴 | 内容展开、对象名、偏好设置 |
| `ChatPage.tsx` | 🔴 | 消息搜索、翻页方向、组件拆分 |
| `ImageUploader.tsx` | 🔴 | 进度条、拖拽排序 |
| `GoodsDetailPage.tsx` | 🔴 | ISO时间、卖家名片、图片lightbox |
| `CartPage.tsx` | 🔴 | 快捷联系、去重提示 |
| `GoodsListPage.tsx` | 🔴 | 分类取消、价格校验 |
| `HomePage.tsx` | 🔴 | 公告栏、无限滚动底部、EndOfList |
| `Modal.tsx` | 🔴 | 移动端底部面板 |
| `ShareButton.tsx` | 🟡 | 覆盖全部详情页 |
| `MyFavoritesPage.tsx` | 🟡 | 已部分优化（确认） |
| `ResourceDetailPage.tsx` | 🟡 | 评论、举报、编辑 |
| `MyGoodsPage.tsx` | 🟡 | 搜索筛选 |
| `MyPostsPage.tsx` | 🟡 | 搜索筛选 |
| `DatingChatPage.tsx` | 🟡 | 聊天入口统一 |
| 全局 | 🟡 | 草稿保存、昵称同步、校区统一 |
| `ExplorePage.tsx` | 🟢 | 排行榜、分享 |
| `TreeHolePage.tsx` | 🟢 | ISO时间、举报UI |
| `MathCaptcha.tsx` | 🟢 | 重试限制 |
| `NetworkStatus.tsx` | 🟢 | 自动重试、弱网提示 |
| 全局 CSS | 🟢 | 深色模式硬编码排查 |
| 全局 | 🟢 | Toast统一、console清理、ARIA |

---

## 附录 B：已排除项（已在之前会话中修复，无需重复）

以下 P2 问题经核实已在前端代码中修复或后端已实现：

| # | 问题 | 证据 |
|---|------|------|
| #55 | 分页器简陋 | `Pagination.tsx` 已有跳转页码 + 总页数 + 跳转输入框 |
| #59 | 图片加载占位 | `LazyImage` 已含 fallback，部分页面已用 |
| #61 | 收藏列表不能操作 | `MyFavoritesPage.tsx` 已含 `联系` / `加购` / `详情` 按钮 |
| #72 | console.log | 部分清理（剩余需配置 vite 构建时移除） |
| #74 | API 硬编码 | 已改为 `VITE_API_URL` 环境变量 |
| #54 | ISO 时间戳 | `formatTime` / `formatRelativeTime` 已实现（需全站排查替换） |

---

## 附录 C：不纳入本次优化的项（需后端配合或 v3.0 大版本）

| 问题 | 原因 |
|------|------|
| 浏览器推送通知（#49） | 需 Service Worker PushManager + 后端 VAPID 密钥 |
| 列表虚拟化（#45） | 当前翻页方案可用，react-window 引入在 v3.0 瀑布流场景更有价值 |
| 富文本编辑器（#82） | 需评估依赖体积 + 后端存储兼容（Markdown → HTML 转换） |
| 视频流 / 微信私信 / 抖音 | 这属于 v3.0 三大模块改造（计划 70 个任务），不纳入此轮 UI 优化 |
| 校园系统打通（#83） | 需对接学校 API，非纯前端问题 |

---

*本文档聚焦纯前端 UI/UX 优化，所有建议均可在不修改后端代码的前提下实施（少数涉及新增后端 API 的参数会特别标注）。建议按优先级逐项推进，每完成一批用 Playwright 截图对比验证。*
