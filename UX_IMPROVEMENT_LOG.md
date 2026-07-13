# 轻淘校园 UX 提升日志

> 开始时间：2026-06-18
> 策略：8 个独立 Agent 并行处理 8 个维度，各自在隔离 worktree 中工作

---

## Dimension 3: 信任与社交证明 ✅
| 文件 | 改动 |
|------|------|
| src/components/common/ReputationBadge.tsx | 新建：信誉标签组件（等级+交易数+好评率） |
| src/pages/profile/UserProfilePage.tsx | 添加 ReputationBadge |
| src/pages/goods/GoodsDetailPage.tsx | 添加 ReputationBadge + seller info |
| src/pages/square/PostDetailPage.tsx | 评论点赞/回复 + "最有帮助"排序 |
| src/components/common/ReportModal.tsx | 新建：分类举报弹窗（3步骤） |
验证: `npx tsc --noEmit` → 零错误

## Dimension 4: 错误韧性 ✅
| 文件 | 改动 |
|------|------|
| src/utils/errorHandler.ts | 新建：统一错误分类+文案映射 |
| src/components/common/OfflineBar.tsx | 新建：全局离线检测横条+自动重连 |
| src/App.tsx | 挂载 OfflineBar |
| src/pages/goods/PublishGoodsPage.tsx | 发布失败保留表单+重试按钮 |
| src/pages/cart/CartPage.tsx | 下单失败重试 |
| src/pages/square/PublishPostPage.tsx | 发帖失败保留内容+重试 |
验证: `npx tsc --noEmit` → 零错误

## Dimension 2: 搜索与内容发现 ✅
| 文件 | 改动 |
|------|------|
| src/pages/search/SearchPage.tsx | 搜索建议下拉 + 搜索历史localStorage + 热门搜索标签 |
| src/pages/home/HomePage.tsx | 新增"为你推荐"横向滚动区块 |
| src/pages/goods/GoodsDetailPage.tsx | 底部新增"相关推荐"横向滚动 |
| src/utils/storage.ts | 搜索历史key改为'search_history'，上限改为20 |
验证: `npx tsc --noEmit` → 零错误

## Dimension 1: 新用户引导与空状态 ✅
| 文件 | 改动 |
|------|------|
| src/components/onboarding/OnboardingWalkthrough.tsx | 新建：4步功能引导 walkthrough（聚光灯+工具提示+framer-motion过渡） |
| src/components/layout/AppLayout.tsx | 挂载 OnboardingWalkthrough |
| src/components/layout/SideNav.tsx | 新增 data-onboarding 属性到发布按钮、消息、个人中心导航项 + NavItem 接口扩展 |
| src/pages/home/HomePage.tsx | 新增欢迎卡片（登录用户首次访问时展示，使用 GlassCard）；data-onboarding 添加到商品区域 |
| src/pages/goods/GoodsListPage.tsx | 空状态添加"发布第一件商品"CTA 按钮 |
| src/pages/chat/ConversationsPage.tsx | 空状态更新为"去广场看看"CTA，导航到 /square |
| src/pages/profile/NotificationsPage.tsx | 空状态添加"去首页逛逛"CTA 按钮 |
| src/pages/profile/MyFavoritesPage.tsx | 空状态添加"去发现好物"CTA 按钮，导航到 /goods |
验证: `npx tsc --noEmit` → 零错误

## Dimension 5: 表单体验 ✅
| 文件 | 改动 |
|------|------|
| src/components/common/CharCounter.tsx | 新建：字数计数器+进度条+颜色警告 |
| src/components/common/StepIndicator.tsx | 新建：多步骤进度指示器 |
| src/components/common/FormField.tsx | 新建：带必填标记+行内错误的表单字段包装 |
| src/components/common/ImageUploader.tsx | 上传进度条+上传前本地预览+拖拽排序+上/下箭头+计数 |
| src/components/common/index.ts | 导出 CharCounter、StepIndicator、FormField |
| src/pages/goods/PublishGoodsPage.tsx | 添加字数计数+步骤指示+FormField+重试 |
| src/pages/square/PublishPostPage.tsx | 添加字数计数+FormField+重试 |
| src/pages/square/PublishLostFoundPage.tsx | 添加字数计数 |
| src/pages/profile/EditProfilePage.tsx | bio字段添加字数计数+FormField+maxLength更新为200 |
| src/pages/chat/ChatPage.tsx | 消息输入添加字数计数 |
验证: `npx tsc --noEmit` → 零错误

## Dimension 6: 无障碍 ✅
| 文件 | 改动 |
|------|------|
| src/styles/a11y-fixes.css | 新建：焦点环+对比度修复+暗黑模式文字对比度 |
| src/styles/globals.css | 导入 a11y-fixes.css |
| src/components/ui/Modal.tsx | role=dialog + aria-modal=true + aria-labelledby + Escape关闭 + Tab焦点锁定 + 关闭时恢复焦点 |
| src/components/ui/GlassCard.tsx | GlassSheet: role=dialog + aria-modal + Escape关闭 + 焦点锁定 + 可选aria-label/ariaLabelledby属性 |
| src/components/layout/SideNav.tsx | 折叠状态nav items添加aria-label + 发布按钮/折叠切换按钮添加aria-label |
| src/pages/home/HomePage.tsx | GoodsItem添加role=button+tabIndex+aria-label+键盘处理 + 公告模态框添加role=dialog+aria-modal+aria-labelledby+Escape关闭 + 公告链接添加role=button+aria-label+键盘处理 |
| src/pages/goods/GoodsListPage.tsx | 分类滚动箭头添加aria-label + 商品卡片添加role=button+tabIndex+aria-label+键盘处理 |
| src/pages/square/SquarePage.tsx | FeedCard添加role=button+tabIndex+aria-label+键盘处理 |
| src/pages/chat/ChatPage.tsx | 返回/搜索/通话/更多/语音/表情/附件/发送按钮全部添加aria-label + 表情按钮添加描述性aria-label + 引用取消按钮 + 滚动到底部按钮 |
验证: aria-label 60次覆盖23个文件 + role=dialog 6次覆盖5个文件 + tsc 零错误

## Dimension 8: 微交互打磨 ✅
| 文件 | 改动 |
|------|------|
| src/components/common/CelebrationEffect.tsx | 新建：点赞/收藏粒子庆祝动画（8-12个随机心形/星形粒子，飞散+淡出+缩放） |
| src/components/common/FlyToCart.tsx | 新建：加入购物车飞入动画（贝塞尔曲线路径，到达后购物车图标弹跳） |
| src/components/chat/MessageBubble.tsx | 消息已发送→已送达→已读状态指示器，motion动画过渡 |
| src/pages/square/PostDetailPage.tsx | 帖子点赞触发庆祝动画，新增点赞按钮+计数 |
| src/pages/goods/GoodsDetailPage.tsx | 收藏触发庆祝动画 + 加购触发飞入动画 |
| src/pages/profile/MyFavoritesPage.tsx | 取消收藏触发小强度庆祝动画 |
| src/components/layout/LiquidTabBar.tsx | TabBar弹性缩放(0.8→1.15→1.0) + layoutId滑动背景指示器 + spring动画 |
| src/styles/liquid-glass.css | 移除CSS静态背景，由framer-motion layoutId pill接管 |
| src/styles/liquid-glass-light.css | 同上 |
验证: `npx tsc --noEmit` → 零错误

## Dimension 7: 性能优化 ✅
| 文件 | 改动 |
|------|------|
| src/router/index.tsx | 所有页面 React.lazy + Suspense（59个懒加载，已验证） |
| Multiple pages (20+ files) | 所有 <img> 添加 loading=lazy + decoding=async |
| src/components/common/VirtualList.tsx | 新建：虚拟滚动组件（IntersectionObserver+绝对定位，50+项启用） |
| src/pages/chat/ConversationsPage.tsx | 应用虚拟滚动（50+对话时自动启用） |
| src/pages/goods/GoodsListPage.tsx | 导入 VirtualList（分页机制已处理10+项场景） |
| src/components/common/UserAvatar.tsx | React.memo 包装 + decoding=async |
| src/components/common/EmptyState.tsx | React.memo 包装 |
| src/components/common/Skeleton.tsx | 10个子组件全部 React.memo 包装 |
| src/pages/home/HomePage.tsx | GoodsItem React.memo 包装 + 横幅 img decoding=async |
| src/components/common/MathCaptcha.tsx | 验证码 img decoding=async（不懒加载，关键渲染路径） |
| src/components/layout/SideNav.tsx | logo img decoding=async（不懒加载，关键渲染路径） |
验证: lazy 59个 + lazyimg 24文件 + memo 5文件 + tsc 零错误

