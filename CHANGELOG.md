# Changelog

## v1.0.30 (2026-06-04)

### 恋爱空间升级
- DatingChatPage 新增破冰话题快捷回复（8 条校园场景话题）
- CreatePostModal 新增图片上传功能
- DatingProfilePage 新增资料完善度进度条（含提示）
- DatingSquarePage 空态优化（引导文案 + 动画）

## v1.0.29 (2026-06-04)

### 10 轮迭代完成
- **R1-R5**: 全项目 60+ 函数 parseInt isNaN 校验 100% 覆盖
- **R6**: 数据库索引验证 + Prisma schema 审查
- **R7**: .gitignore 补充（tar.gz / populate-prod.js）
- **R8-R10**: 树洞控制器 / 类型安全 / 编译验证

### 累计 (v1.0.16 → v1.0.29)
- Bug 修复: 15 项
- 安全加固: 18 项
- 性能优化: 4 项
- 功能补全: 10 项
- UI 优化: 8 项
- 健壮性: 60+ isNaN 校验

## v1.0.27 (2026-06-04)

### 健壮性增强
- dating/images/messages/user/treehole 控制器 isNaN 补全（20+ 函数）
- 全项目 parseInt 后 isNaN 校验已 100% 覆盖

## v1.0.26 (2026-06-04)

### 健壮性增强
- lostfound 控制器所有 parseInt 补全 isNaN（6 个函数）
- 后端所有控制器 isNaN 校验已全覆盖（40+ 函数）

## v1.0.25 (2026-06-04)

### 健壮性增强
- goods/post 控制器所有 parseInt 补全 isNaN 校验（12 个函数）

## v1.0.24 (2026-06-04)

### 健壮性增强
- notification 控制器 markRead/deleteNotification 加 isNaN 校验
- batch-read/batch-delete ids.map(Number) 已由 Prisma 容错

## v1.0.23 (2026-06-04)

### 健壮性增强
- 所有控制器 parseInt 后增加 isNaN 校验（防止 500 错误）
- block/banner/cart/admin/goods/post/lostfound/qa 等 14 个函数加防护

## v1.0.22 (2026-06-03)

### UI 修复
- 黑名单页使用统一 Header 组件（替换裸 h1）
- 黑名单页适配分页 API 响应格式
- 黑名单页用户链接 `/profile/:id` → `/user/:id`

## v1.0.21 (2026-06-03)

### UI 优化
- 聊天输入框增加字数计数器（>450 字变红警告）
- 会话列表显示"你："前缀（自己发出的最后一条消息）
- 恋爱会话列表同步增加"你："前缀

## v1.0.20 (2026-06-03)

### 功能补全
- GoodsDetailPage 举报弹窗增加预设原因（虚假商品/价格不实/商品违规/卖家欺诈/其他）
- QaDetailPage 新增举报功能（含预设原因 + 自定义描述）
- DatingSquarePage 帖子新增举报按钮
- ResourceListPage 新增 热门/最新 排序切换

### 类型扩展
- admin.submitReport 新增 qapost 举报类型支持

## v1.0.19 (2026-06-03)

### 安全增强
- 树洞匿名码生成 Math.random() → crypto.randomBytes()（防预测）
- 验证码 code 生成 Math.random() → crypto.randomBytes()（防预测）

## v1.0.18 (2026-06-03)

### 安全增强
- dating.ensureProfile avatarSeed Math.random() → crypto.randomBytes()（防预测攻击）
- dating.updateProfile 新建 profile 同改
- dating.followUser 不再为被关注者自动创建 profile（防滥用批量创建）

### 防护加固
- images/status 批量查询限制最多 50 个 ID（防慢查询攻击）

## v1.0.17 (2026-06-03)

### Bug 修复
- 修复 LostFoundDetailPage 举报弹窗 textarea 逻辑混乱（同 PostDetailPage 的修复）
- 修复 QA 详情页浏览量计入作者本人（与其他详情页不一致）

### 安全增强
- QA 发帖增加 L1 敏感词检测（标题+内容）
- QA 回答增加 L1 敏感词检测
- QA category/type 白名单校验（防注入任意值）
- QA 内容增加长度限制（标题100字、内容2000字、回答2000字）
- QA 内容 HTML 标签剥离（防 XSS）

### 功能完善
- 课程资源列表新增 sort 参数（newest / hot）

### 性能优化
- 课程资源详情下载计数改为非等待更新（消除 Promise.all 竞态）

## v1.0.16 (2026-06-03)

### Bug 修复
- 修复 goods/post/lostfound 编辑后 AI 审核代码因 return 前置而永远不执行（3 个控制器死代码）
- 修复 admin.rejectReviewAction 不支持评论类型（goods_comment/post_comment/lostfound_comment）
- 修复 getNewest/getHot/getGoodsList 默认列出 pending 商品但详情页拒绝非作者访问
- 修复树洞举报因字段名 type→targetType 不匹配导致举报无效
- 修复 shouldShowTime 逻辑反转（在最后一条而非间隔后显示时间）
- 修复聊天时间戳使用相对时间（"5分钟前"）而非微信风格绝对时间

### 性能优化
- getConversations N+1 查询 → 单条 SQL（150 次→4 次查询）
- getConversations 增加分页支持
- getHot 全量加载 → take:200 限制

### 安全增强
- sendMessage 增加 express-rate-limit（30 条/分钟）+ typing（20 次/分钟）
- 消息内容 HTML 标签剥离（防 XSS）
- type 字段白名单校验（text/image）

### 功能完善
- DatingChatPage 补全举报功能（消息选择 + AI 审核 + 违规标记）
- DatingChatPage 头部菜单增加拉黑功能
- getGoodsList 增加已注销卖家匿名化处理
- PostDetailPage 举报弹窗重构（reportReason + customReason 分离）

### 代码清理
- moderation.service.ts 删除未使用的 requestBody 变量
- 新增 formatChatTime 工具函数（微信风格绝对时间）

## v1.0.15 (2026-06-02)
- 商品详情页图片显示逻辑完善：发布者始终看到原图

## v1.0.14 (2026-06-02)
- 每日匹配随机选择改用 crypto.randomInt（防预测攻击）
- 安全提问密码重置码改用 crypto.randomInt

## v1.0.13 (2026-06-02)
- JWT sign/verify 显式指定 HS256 算法（防算法混淆攻击）
- 找回密码流程优化：移除邮箱依赖，引导至安全提问验证

## v1.0.12 (2026-06-02)
- Q&A/考试资料控制器非数字 ID 返回 400（原 500 崩溃）
- 内容审核中间件增加 HTML 标签剥离（防 XSS）
- 新增 pagination 工具函数

## v1.0.11 (2026-06-02)
- 密码重置码改用 crypto.randomInt() 替代 Math.random()
- 重置码仅在开发环境返回（NODE_ENV 保护）
- 未登录用户无法查看他人微信/QQ 联系方式
- 文件上传限制提升至 5MB（与前端一致）

## v1.0.10 (2026-06-02)
- 前端版本号同步

## v1.0.9 (2026-06-02)
- CHANGELOG 更新

## v1.0.8 (2026-06-02)
- Q&A 问题详情页新增分享按钮
- 所有详情页统一支持分享

## v1.0.7 (2026-06-02)
- 管理后台新增 8 个统计卡片（今日商品/帖子、待审核、暗色模式）

## v1.0.6 (2026-06-02)
- 商品卡片"已售"状态标签（首页 + 商品列表）

## v1.0.5 (2026-06-02)
- 移动端布局全面验证

## v1.0.4 (2026-06-02)
- CHANGELOG 初始化 + 模块审计

## v1.0.3 (2026-06-02)
- 隐私保护：商品列表隐藏微信/QQ
- 修复管理后台"内容审核"死链接
- 注册限流提示修正

## v1.0.2 (2026-06-02)
- 页面标题动态更新
- 搜索支持用户类型结果
- 修复图标引用

## v1.0.1 (2026-06-02)
- 12 个构建错误修复（TS6/React 19 适配）

## v1.0.0 (2026-06-02)

### 核心功能
- 用户系统（注册/登录/安全验证/找回密码）
- 商品交易（发布/浏览/搜索/图片审核/AI文字审核）
- 广场（帖子 + 失物招领）
- 私信聊天（文字/图片/表情/AI违规检测）
- 树洞（匿名发帖/IP防刷）
- 考试资料（上传/下载）
- Q&A 问答
- 恋爱空间（匿名匹配→私聊→身份揭示→恋爱关系）
- 全站搜索（商品/帖子/失物/用户）
- 暗色模式 + 管理后台 + 通知系统

### 技术栈
- 前端: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + Zustand 5 + React Router 7
- 后端: Express 4 + Prisma 5 (SQLite) + JWT + Sharp + Winston
