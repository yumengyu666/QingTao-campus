# 轻淘 QingTao

> 郑州轻工业大学校园二手交易 + 社区平台
> 版本：v2.1 | 状态：功能全部完成

轻淘是面向郑州轻工业大学（科学校区 & 东风校区）师生的校园平台，覆盖**二手交易、社区广场、匿名交友、校园答疑、站内私信**等核心场景，并内置**敏感词 + DeepSeek AI 双层内容审核**机制。

> 平台性质：个人学习项目，非商业运营，仅提供信息发布与浏览功能，不提供线上交易服务。

---

## ✨ 核心功能

| 模块 | 说明 |
|------|------|
| 🛍️ 二手交易 | 商品发布/浏览/搜索/购物车/收藏，支持出售、求购、出租、求租四种类型 |
| 🏘️ 社区广场 | 帖子动态、失物招领 |
| 💘 匿名交友 | 恋爱空间，四层隐私保护（路人→单向关注→互关→恋爱请求通过） |
| 🎓 校园答疑 | 按分类提问/回答/点赞/采纳最佳答案 |
| 💬 站内私信 | 文字/图片/表情消息，未互关限制 10 条 |
| 🔔 消息通知 | 关注、评论、公告等通知聚合 |
| 🛡️ 内容审核 | 敏感词表（300+ 词，12 类）+ DeepSeek AI 双层审核，先发后审 |
| 🕳️ 树洞 | 匿名发帖与评论 |
| 📚 考试资料 | 课程资料上传、下载、检索 |
| 🖼️ 图片审核 | 上传即生成模糊版，管理员审核后放行 |

## 🛠️ 技术栈

### 前端

| 层 | 选型 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion |
| 路由 | React Router 7（懒加载） |
| 状态 | Zustand |
| UI | react-hot-toast、Swiper、react-icons、lucide-react |

### 后端

| 层 | 选型 |
|---|---|
| 运行时 | Node.js + Express 4 + TypeScript |
| 数据库 | SQLite (WAL mode) + Prisma 5（31 个模型） |
| 认证 | JWT（Access 15min + Refresh 7d）+ bcryptjs |
| 上传 | Multer + Sharp（WebP 80% + 50px 模糊版） |
| 安全 | Helmet + CORS + 敏感词过滤 |
| AI 审核 | DeepSeek V4 Flash / Chat（0/1 输出，temperature=0） |
| 日志 | Winston |

## 📁 项目结构

```
QingTaoCampus/
├── qing-tao-campus/          # 前端（React + Vite）
│   └── src/
│       ├── router/           # 30+ 路由
│       ├── stores/           # Zustand 状态
│       ├── components/       # common / layout
│       ├── pages/            # 30 页面
│       └── styles/           # 设计系统
├── qingtao-server/           # 后端（Express + Prisma）
│   ├── prisma/schema.prisma  # 31 模型
│   └── src/
│       ├── middleware/       # auth / upload / moderation
│       ├── routes/           # 17 个路由文件
│       ├── services/         # auth / notification / AI 审核
│       └── utils/            # 敏感词 / logger / images
├── deploy/                   # 部署配置
├── Dockerfile
├── nginx.conf
└── docs/（*.md）             # 项目文档：API / 审核系统 / 用户指南 / 测试报告等
```

## 🚀 快速启动

```bash
# 后端（端口 3000）
cd qingtao-server
npm install
npx prisma db push
npx tsx prisma/seed.ts        # 测试数据
npx tsx src/index.ts

# 前端（端口 5175）
cd qing-tao-campus
npm install
npx vite
```

### 测试账号（seed 数据）

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | `admin`、`admin2` | `123456` |
| 普通用户 | `zhangsan` ~ `chenchen`（10 人） | `123456` |

## 🧠 AI 审核机制

```
用户提交文字
  → Layer 1：敏感词表（300+ 词，12 类，<1ms）→ 命中 → 400 拦截
  → 未命中 → 发布成功
  → Layer 2：DeepSeek AI（后台异步，<3s）→ "0" 安全 / "1" 违规下架 + 通知作者
```

## 📄 项目文档

- [PROJECT.md](./PROJECT.md) — 项目总文档
- [API.md](./API.md) — 接口文档
- [MODERATION_SYSTEM.md](./MODERATION_SYSTEM.md) — 审核系统详解
- [USER_GUIDE.md](./USER_GUIDE.md) — 用户功能指南
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) — 管理员功能指南
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — 安全审计
- [TEST_REPORT.md](./TEST_REPORT.md) — 测试报告
- [CHANGELOG.md](./CHANGELOG.md) — 更新日志

## 📄 License

个人学习项目，仅供学习交流使用。
