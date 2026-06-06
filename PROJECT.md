# 轻淘 (QingTao) — 项目文档

> 版本：v2.1 | 日期：2026-06-01 | 状态：✅ 全部完成
> 郑州轻工业大学校园二手交易 + 社区平台

---

## 1. 项目定位

轻淘是郑州轻工业大学（科学校区 & 东风校区）的校园平台，核心功能：

- **二手交易** — 商品发布/浏览/搜索/购物车/收藏，买卖双方通过站内私信或微信/QQ线下交易
- **社区广场** — 帖子、失物招领
- **匿名交友** — 恋爱空间（关注→看清头像，互关→看清帖子，恋爱请求→交换联系方式）
- **校园答疑** — 按分类提问/回答/点赞/采纳最佳答案
- **站内私信** — 文字/图片/表情消息，未互关限制10条
- **消息通知** — 关注、评论、公告等通知聚合
- **内容审核** — 敏感词表 + DeepSeek AI 双层审核，先发后审

**平台性质**：个人学习项目，非商业运营，仅提供信息发布与浏览功能，不提供线上交易服务。

---

## 2. 技术栈

### 前端

| 层 | 选型 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion |
| 路由 | React Router 7（懒加载） |
| 状态 | Zustand |
| HTTP | apiFetch（fetch 封装） |
| Toast | react-hot-toast |
| 轮播 | Swiper |
| 图标 | react-icons (Feather Icons) + lucide-react |
| 登录/注册页 | 动态渐变玻璃态 |

### 后端

| 层 | 选型 |
|---|---|
| 运行时 | Node.js + Express 4 + TypeScript |
| 数据库 | SQLite (WAL mode) + Prisma 5 |
| 认证 | JWT (Access 15min + Refresh 7d) + bcryptjs |
| 上传 | Multer + Sharp (WebP 80% + 50px 模糊版) |
| 安全 | Helmet + CORS + 敏感词过滤 |
| AI 审核 | DeepSeek V4 Flash / Chat（角色锁定 0/1 输出） |
| 日志 | Winston |

---

## 3. 项目结构

```
QingTaoCampus/
├── PROJECT.md                    # 本文件
├── MODERATION_SYSTEM.md          # 审核系统详解
├── MODERATION_DESIGN.md          # 审核设计文档
├── USER_GUIDE.md                 # 用户功能指南
├── ADMIN_GUIDE.md                # 管理员功能指南
├── PAGES_PLAN.md                 # 前端完善计划
├── AI_PROMPT.md                  # AI 登录页开发提示词
├── qing-tao-campus/              # 前端
│   └── src/
│       ├── main.tsx / App.tsx
│       ├── router/index.tsx      # 30+ 路由
│       ├── types/                # TS 类型定义
│       ├── stores/               # Zustand (auth/ui/search/unread)
│       ├── utils/                # api/storage/format/validators/constants
│       ├── hooks/                # useAuth / useUtils
│       ├── components/
│       │   ├── common/           # Skeleton, EmptyState, ImageUploader, UserAvatar, MathCaptcha, ModerationBadge...
│       │   └── layout/           # AppLayout, AdminLayout, Header, SideNav
│       ├── pages/                # 30 页面
│       └── styles/globals.css    # 设计系统（9种动画 + glass + skeleton + 工具类）
└── qingtao-server/               # 后端
    ├── prisma/schema.prisma      # 31 模型
    └── src/
        ├── index.ts / app.ts
        ├── config/               # env / database / jwt
        ├── middleware/           # auth / upload / validate / errorHandler / rateLimiter / moderation
        ├── routes/               # 17 个路由文件
        ├── controllers/          # 控制器
        ├── services/             # auth / notification / upload / moderation(AI)
        ├── utils/                # response / sensitive(300+词) / logger / contact / images
        └── types/
```

---

## 4. 前端页面（全部完成）

| # | 页面 | 路由 | 状态 |
|---|------|------|:---:|
| 1 | 登录 | `/login` | ✅ |
| 2 | 注册 | `/register` | ✅ |
| 3 | 首页 | `/` | ✅ |
| 4 | 商品列表 | `/goods` | ✅ |
| 5 | 商品详情 | `/goods/:id` | ✅ |
| 6 | 发布/编辑商品 | `/publish/goods` | ✅ |
| 7 | 购物车 | `/cart` | ✅ |
| 8 | 广场 | `/square` | ✅ |
| 9 | 帖子详情 | `/square/post/:id` | ✅ |
| 10 | 发布/编辑帖子 | `/publish/post` | ✅ |
| 11 | 失物详情 | `/square/lostfound/:id` | ✅ |
| 12 | 发布失物 | `/publish/lostfound` | ✅ |
| 13 | 搜索 | `/search` | ✅ |
| 14 | 我的主页 | `/profile` | ✅ |
| 15 | 编辑资料 | `/profile/edit` | ✅ |
| 16 | 他人主页 | `/user/:id` | ✅ |
| 17 | 我的商品 | `/profile/goods` | ✅ |
| 18 | 我的帖子 | `/profile/posts` | ✅ |
| 19 | 我的收藏 | `/profile/favorites` | ✅ |
| 20 | 关注/粉丝 | `/profile/following` | ✅ |
| 21 | 通知 | `/profile/notifications` | ✅ |
| 22 | 浏览记录 | `/profile/history` | ✅ |
| 23 | 修改密码 | `/profile/password` | ✅ |
| 24 | 会话列表 | `/messages` | ✅ |
| 25 | 聊天窗口 | `/messages/:userId` | ✅ |
| 26 | 恋爱广场 | `/dating` | ✅ |
| 27 | 恋爱资料 | `/dating/profile` | ✅ |
| 28 | 答疑广场 | `/qa` | ✅ |
| 29 | 答疑详情 | `/qa/:id` | ✅ |
| — | 管理后台 | `/admin` | ✅ |
| — | 图片审核 | `/admin/images` | ✅ |
| — | 用户管理 | `/admin/users` | ✅ |

---

## 5. 数据库模型（31 个，全部已实现）

| # | 模型 | 说明 |
|---|------|------|
| 1 | User | 用户（role, status, tokenVersion） |
| 2 | Follow | 关注 |
| 3 | Category | 商品分类 |
| 4 | Goods | 商品（listType: sale/buy/rent/rent_want, status: approved/offline/sold） |
| 5 | GoodsComment | 商品评论 |
| 6 | CartItem | 购物车 |
| 7 | Favorite | 收藏 |
| 8 | Post | 帖子 |
| 9 | PostComment | 帖子评论 |
| 10 | LostFound | 失物招领 |
| 11 | LostFoundComment | 失物评论 |
| 12 | Notification | 通知 |
| 13 | Report | 举报 |
| 14 | Announcement | 公告 |
| 15 | Banner | 首页轮播 |
| 16 | ProfileChange | 资料修改记录 |
| 17 | SearchLog | 搜索日志 |
| 18 | ChatMessage | 聊天消息 ✅ |
| 19 | Block | 用户拉黑 |
| 20 | ImageReview | 图片审核（url + blurredUrl）✅ |
| 21 | DatingProfile | 恋爱区资料 ✅ |
| 22 | DatingRequest | 恋爱请求 ✅ |
| 23 | DatingPost | 恋爱区帖子 ✅ |
| 24 | DatingFollow | 恋爱区关注 ✅ |
| 25 | DatingMessage | 恋爱区消息 |
| 26 | QaPost | 答疑问题 ✅ |
| 27 | QaAnswer | 答疑回答 ✅ |
| 28 | QaVote | 答疑点赞 ✅ |
| 29 | TreeHolePost | 树洞帖 |
| 30 | TreeHoleComment | 树洞评论 |
| 31 | CourseResource | 考试资料 |

---

## 6. 业务规则

### 内容发布（v2.0：发布即上架 + 先发后审）
- 商品/帖子/失物招领/评论 → 发布后立即可见（词表同步拦截明显违规，AI 异步后台审核）
- 资料修改 → 立即生效
- AI 审核通过 → 无感，AI 审核违规 → 内容自动下架 + 通知作者

### AI 审核机制
```
用户提交文字
  → Layer 1：敏感词表（300+ 词，12 类，<1ms）→ 命中 → 400 拦截
  → 未命中 → 201 发布成功
  → Layer 2：DeepSeek AI（后台异步，<3s，最多重试1次，最多轮询5次）
    → "0" → 安全
    → "1" → 违规 → 内容下架/屏蔽 + 通知作者
    → 非0/1 → 重试 → 仍异常 → 放行
    → 故障 → 降级放行 + 熔断
```
- AI 提示词：角色原子化 + 输出 0/1 + 免疫显式化 + 示例强化
- 技术约束：temperature=0, max_tokens=1, thinking=disabled, stop序列
- 17 个路由全部接入审核中间件

### 前端审核状态反馈
- 聊天新消息：右下角 "AI审核中" → 轮询（5次×3s）→ "⚠ 违规" / 消失
- 商品/帖子详情：轮询（4次×3s）→ "AI审核未通过" / 正常

### 图片审核机制
```
用户上传图片
  → 后端自动生成模糊版（50px + 高斯模糊）
  → 前端默认展示模糊图片
  → 管理员审核图片合规性
    ├─ 通过 → 图片变清晰
    └─ 拒绝 → 关联内容下架 + 通知作者
```

### 商品交易
| listType | 标签 | 说明 |
|----------|------|------|
| `sale` | 绿色 "出" | 出售 |
| `buy` | 红色 "求" | 求购 |
| `rent` | 绿色 "租" | 出租 |
| `rent_want` | 红色 "求租" | 求租 |

### 商品状态
| status | 说明 |
|--------|------|
| `approved` | 已上架（默认） |
| `offline` | 已下架（AI违规/图片被拒/手动下架） |
| `sold` | 已卖出 |

### 恋爱区隐私四层
| 关系 | 看头像 | 看昵称 | 看帖子 | 看联系方式 |
|------|:---:|:---:|:---:|:---:|
| 路人 | 像素 | 匿名 | ❌ | ❌ |
| 单向关注 | 自定义 | ✅ | ✅ | ❌ |
| 双向互关 | 自定义 | ✅ | ✅ | ❌ |
| 恋爱请求通过 | 自定义 | ✅ | ✅ | ✅ |

### 私信规则
- 未互关：最多发 10 条消息
- 互关后：无限制
- 在线状态：3 分钟内活跃 → 在线绿点；否则 "离线 X 分钟/小时/天"

---

## 7. 后端接口

### 认证
```
POST   /api/auth/register        { username, password, captchaId, captchaAnswer }
POST   /api/auth/login           { username, password, captchaId, captchaAnswer }
POST   /api/auth/refresh         { refreshToken }
GET    /api/auth/me              → User
GET    /api/captcha/generate     → { captchaId, svg }
```

### 用户 · 商品 · 购物车 · 收藏 · 帖子 · 失物招领 · 通知 · 搜索 · 上传
全功能实现，详见 `MODERATION_SYSTEM.md` 或之前对话。

### 聊天
```
GET    /api/messages/conversations
GET    /api/messages/:userId
POST   /api/messages/:userId        { content, type }
```

### 恋爱区
```
GET    /api/dating/profile
POST   /api/dating/profile          { nickname, gender, bio, ... }
GET    /api/dating/posts
POST   /api/dating/posts            { content, images }
POST   /api/dating/:userId/follow
```

### 校园答疑
```
GET    /api/qa                      ?category=
GET    /api/qa/:id
POST   /api/qa                      { title, content, category }
POST   /api/qa/:id/answers          { content }
POST   /api/qa/answers/:id/vote
POST   /api/qa/answers/:id/best
```

### 图片审核
```
GET    /api/admin/images            ?status=
POST   /api/admin/images/:id/approve
POST   /api/admin/images/:id/reject  { reason }
GET    /api/images/status           ?ids= → 批量查询
```

### 管理员
数据概览 / 用户管理 / 分类管理 / 公告 / 举报 / 轮播图 — 全部实现。

### 树洞
```
GET    /api/treehole/posts             ?page=&pageSize=
GET    /api/treehole/posts/:id         → 帖子详情 + 评论列表
POST   /api/treehole/posts             { code, content, images }
POST   /api/treehole/posts/:id/comments { code, content }
```

### 考试资料
```
GET    /api/resources                  ?courseName=&courseCode=&type=&keyword=&page=&pageSize=
GET    /api/resources/:id
POST   /api/resources                  { courseName, courseCode, title, type, description, fileUrl, fileSize }
DELETE /api/resources/:id
POST   /api/resources/:id/download     → { fileUrl }
```

### 拉黑
```
GET    /api/block                      ?page=&pageSize=
POST   /api/block/:userId
DELETE /api/block/:userId
```

### 恋爱消息
```
GET    /api/dating/conversations
GET    /api/dating/messages/:userId    ?page=&pageSize=
POST   /api/dating/messages/:userId    { content, type }
```

---

## 8. 测试数据

```bash
cd qingtao-server && npx tsx prisma/seed.ts
```

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | `admin`、`admin2` | `123456` |
| 普通用户 | `zhangsan` ~ `chenchen`（10人） | `123456` |

- 20 个分类 + 5 张轮播图 + 8 个商品 + 4 个帖子 + 3 个失物招领 + 1 个答疑问题

---

## 9. 启动

```bash
# 后端
cd qingtao-server
npm install && npx prisma db push && npx tsx prisma/seed.ts
npx tsx src/index.ts          # → http://localhost:3000

# 前端
cd qing-tao-campus
npm install && npx vite       # → http://localhost:5175
```

---

## 10. Git 标签

| 标签 | 说明 |
|------|------|
| `state-0` | 原始基线（白色登录页） |
| `state-6` | 当前版本（渐变玻璃态） |

---

## 11. 未完成

| 项目 | 状态 |
|------|:---:|
| — | ✅ 全部完成 |
