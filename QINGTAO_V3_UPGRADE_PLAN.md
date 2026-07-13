# 轻陶 v3.0 三大模块深度改造计划

> **目标**: 私信→微信1:1 | 广场→小红书1:1 | 视频流→抖音1:1
> **创建时间**: 2026-06-11
> **预计工作量**: 60-80轮迭代，覆盖后端+前端+测试

---

## 目录
- [一、微信私信 1:1 还原](#一微信私信-11-还原)
- [二、小红书广场 1:1 还原](#二小红书广场-11-还原)
- [三、抖音视频流 1:1 还原](#三抖音视频流-11-还原)
- [四、跨模块共享基础设施](#四跨模块共享基础设施)
- [五、任务拆分总览](#五任务拆分总览)

---

## 一、微信私信 1:1 还原

### 1.1 现状分析

| 维度 | 当前状态 | 微信对标 |
|------|:---:|:---:|
| 消息格式 | 纯文本/图片 | 文本/图片/语音/视频/文件/位置/名片 |
| 消息气泡 | 无差异样式 | 浅绿(发送)/白色(接收) 圆角气泡 |
| 已读状态 | 无 | 单勾/双勾/蓝色双勾 |
| 消息撤回 | 无 | 2分钟内可撤回，显示"你撤回了一条消息" |
| 消息引用 | 无 | 左滑引用，显示引用内容 |
| 语音消息 | 无 | 按住录音→松开发送→播放 |
| 视频通话 | 无 | WebRTC音视频通话 |
| 会话管理 | 基础列表 | 置顶/免打扰/删除会话/批量操作 |
| 文件传输 | 无 | 发送文档/视频 |
| 位置分享 | 无 | 地图选点→发送位置卡片 |
| 表情包 | Emoji | 自定义表情包/贴图 |
| 聊天记录搜索 | 基础搜索 | 按类型筛选/日期定位 |
| 多地登录 | 无 | 消息同步 |

### 1.2 数据库新增模型

```prisma
// 1. 扩展 ChatMessage — 添加字段
model ChatMessage {
  // === 现有字段 ===
  id           Int      @id @default(autoincrement())
  senderId     Int
  receiverId   Int
  content      String
  type         String   @default("text") // text|image|voice|video|file|location|card|system
  imageStatus  String?  // pending|approved|rejected
  isRead       Boolean  @default(false)
  readAt       DateTime?
  createdAt    DateTime @default(now())
  
  // === 新增字段 ===
  replyToId    Int?         // 引用回复的消息ID
  replyTo      ChatMessage? @relation("MessageReply", fields: [replyToId], references: [id])
  repliedMessages ChatMessage[] @relation("MessageReply")
  
  recalledAt   DateTime?    // 撤回时间，null=未撤回
  
  voiceUrl     String?      // 语音文件URL
  voiceDuration Int?        // 语音时长(秒)
  
  fileUrl      String?      // 文件URL
  fileName     String?      // 文件名
  fileSize     Int?         // 文件大小(bytes)
  
  latitude     Float?       // 位置纬度
  longitude    Float?       // 位置经度
  locationName String?      // 位置名称
  
  cardUserId   Int?         // 名片指向的用户ID
  cardUser     User?        @relation("MessageCardUser", fields: [cardUserId], references: [id])
  
  isDelivered  Boolean   @default(false)  // 送达状态
  isForwarded  Boolean   @default(false)  // 是否为转发消息

  @@index([senderId, receiverId, createdAt])
  @@index([receiverId, isRead])
}
```

```prisma
// 2. 会话设置
model ConversationSetting {
  id          Int      @id @default(autoincrement())
  userId      Int
  peerId      Int
  isPinned    Boolean  @default(false)
  isMuted     Boolean  @default(false)
  muteUntil   DateTime?
  bgImage     String?  // 聊天背景图URL
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, peerId])
}

// 3. 视频/语音通话记录
model CallRecord {
  id          Int      @id @default(autoincrement())
  callerId    Int
  calleeId    Int
  callType    String   // audio|video
  status      String   // missed|rejected|canceled|completed
  duration    Int?     // 通话时长(秒)
  startTime   DateTime @default(now())
  endTime     DateTime?
  
  caller      User     @relation("CallCaller", fields: [callerId], references: [id])
  callee      User     @relation("CallCallee", fields: [calleeId], references: [id])
  
  @@index([callerId, calleeId])
  @@index([calleeId])
}

// 4. 自定义表情包
model StickerPack {
  id          Int      @id @default(autoincrement())
  userId      Int
  name        String
  coverUrl    String
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  stickers    Sticker[]
}

model Sticker {
  id          Int      @id @default(autoincrement())
  packId      Int
  url         String
  sortOrder   Int      @default(0)
  
  pack        StickerPack @relation(fields: [packId], references: [id])
  
  @@index([packId])
}
```

### 1.3 后端 API 新增/修改

| # | 方法 | 路径 | 功能 |
|---|------|------|------|
| 1 | PATCH | `/api/messages/:id/recall` | 撤回消息(2分钟内) |
| 2 | PATCH | `/api/messages/:id/delivered` | 标记消息已送达 |
| 3 | POST | `/api/messages/forward` | 转发消息 `{messageIds, receiverIds}` |
| 4 | GET | `/api/messages/search/detail` | 聊天记录搜索(按类型/日期) |
| 5 | POST | `/api/messages/batch-delete` | 批量删除消息 |
| 6 | GET/PUT | `/api/conversations/settings/:peerId` | 会话设置(置顶/免打扰/背景) |
| 7 | POST | `/api/upload/voice` | 上传语音(WebM/Opus) |
| 8 | POST | `/api/upload/file-message` | 上传聊天文件 |
| 9 | POST | `/api/calls/initiate` | 发起通话 |
| 10 | POST | `/api/calls/:id/answer` | 接听通话 |
| 11 | POST | `/api/calls/:id/reject` | 拒接通话 |
| 12 | POST | `/api/calls/:id/end` | 结束通话 |
| 13 | GET | `/api/calls/history` | 通话记录 |
| 14 | GET | `/api/stickers` | 获取表情包列表 |
| 15 | POST | `/api/stickers` | 上传自定义表情 |

### 1.4 WebSocket 消息扩展

```typescript
// 新增 WS 消息类型
type WsMessageType =
  | 'chat_message'      // 现有
  | 'typing'            // 现有
  | 'new_message'       // 现有
  | 'message_sent'      // 现有
  | 'user_status'       // 现有
  | 'message_recall'    // 新增: 消息撤回通知
  | 'message_delivered' // 新增: 消息送达通知
  | 'message_read'      // 新增: 消息已读通知(蓝色双勾)
  | 'voice_message'     // 新增: 语音消息
  | 'call_incoming'     // 新增: 来电通知
  | 'call_accepted'     // 新增: 通话接通
  | 'call_rejected'     // 新增: 通话拒接
  | 'call_ended'        // 新增: 通话结束
  | 'call_canceled'     // 新增: 取消呼叫
  | 'webrtc_offer'      // 新增: WebRTC Offer
  | 'webrtc_answer'     // 新增: WebRTC Answer
  | 'webrtc_ice'        // 新增: WebRTC ICE Candidate
```

### 1.5 前端组件改造

#### ChatPage 完整重构

```
┌─────────────────────────────────────┐
│ ← 张三                     📞 📹 ⋮  │  ← 导航栏: 返回+昵称+通话按钮+菜单
├─────────────────────────────────────┤
│         ─── 6月11日 周三 ───        │  ← 时间分割线
│                                     │
│  ┌──────────────────────┐           │  ← 文本气泡(他人/白色)
│  │ 下午三点图书馆见？    │           │
│  └──────────────────────┘           │
│              11:32 AM              │
│                                     │
│              ┌──────────────────────┐│  ← 文本气泡(自己/浅绿)
│              │ 好的，没问题         ││
│              └──────────────────────┘│
│                             阅读  ✓✓│  ← 已读双勾(蓝)
│                                     │
│              ┌──────────────────────┐│  ← 引用消息
│              │ ┃ 张三: 下午三点...   ││
│              │ 好的                   ││
│              └──────────────────────┘│
│                                     │
│  ┌──────────────────────┐           │  ← 图片消息
│  │  [图片-圆角]          │           │
│  └──────────────────────┘           │
│                                     │
│              ━━━ 🎤 0:05 ━━━        │  ← 语音消息(自己/波浪条)
│                                     │
│  ┃ 张三向你发起了视频通话 ┃         │  ← 系统消息
│                                     │
│  ┌──────────────┐                   │  ← 位置卡片
│  │ 📍 图书馆三楼 │                   │
│  │ [地图预览]    │                   │
│  └──────────────┘                   │
│                                     │
├─────────────────────────────────────┤
│ 🤍 😊 📎                             │  ← 工具栏: 表情/贴图/附件
├─────────────────────────────────────┤
│ [📎附件菜单:                         │
│  相册 | 拍照 | 文件 | 位置 | 名片    │
│  语音输入 | 视频通话]                 │
├─────────────────────────────────────┤
│  [语音按钮] [输入框]  [表情] [+]     │  ← 底部输入区
└─────────────────────────────────────┘
```

#### 新增子组件

| 组件 | 文件 | 功能 |
|------|------|------|
| `MessageBubble` | `components/chat/MessageBubble.tsx` | 统一消息气泡(文本/图片/语音/文件/位置/名片/引用/系统) |
| `VoiceRecorder` | `components/chat/VoiceRecorder.tsx` | 按住录音按钮，波形动画 |
| `VoicePlayer` | `components/chat/VoicePlayer.tsx` | 语音播放条+进度 |
| `VoiceCallUI` | `components/chat/VoiceCallUI.tsx` | 语音通话界面(全屏) |
| `VideoCallUI` | `components/chat/VideoCallUI.tsx` | 视频通话界面(全屏) |
| `LocationPicker` | `components/chat/LocationPicker.tsx` | 地图选点(高德/腾讯地图) |
| `FileSender` | `components/chat/FileSender.tsx` | 文件选择+发送进度 |
| `ContactCard` | `components/chat/ContactCard.tsx` | 用户名片卡片 |
| `ChatToolbar` | `components/chat/ChatToolbar.tsx` | 底部工具栏(输入框+录音+表情+加号) |
| `AttachmentMenu` | `components/chat/AttachmentMenu.tsx` | 加号弹出菜单(相册/文件/位置/名片/通话) |
| `EmojiPanel` | `components/chat/EmojiPanel.tsx` | 表情面板(Emoji+自定义贴图) |
| `ChatSettings` | `components/chat/ChatSettings.tsx` | 聊天详情页(置顶/免打扰/背景/清空记录) |
| `MessageContextMenu` | `components/chat/MessageContextMenu.tsx` | 长按消息菜单(复制/引用/撤回/转发/删除) |
| `ChatSearchPanel` | `components/chat/ChatSearchPanel.tsx` | 聊天记录搜索面板 |
| `ReadReceiptIcon` | `components/chat/ReadReceiptIcon.tsx` | 已读回执图标(发送中→已送达→已读) |

#### WebRTC 通话实现方案

```
信令流程(WebSocket):
1. Caller → WS → callee: call_incoming { callerId, callType, roomId }
2. Callee → WS → caller: call_accepted { roomId }
3. 双方创建 RTCPeerConnection，交换 SDP/ICE Candidate
4. Caller → WS → Callee: webrtc_offer { sdp }
5. Callee → WS → Caller: webrtc_answer { sdp }
6. 双方 → WS → 对方: webrtc_ice { candidate } (多次)
7. 通话中...
8. 任一方 → WS → 对方: call_ended { roomId, duration }

STUN/TURN配置:
- 开发环境: 免费STUN服务器 stun:stun.l.google.com:19302
- 生产环境: 自建coturn或云服务商TURN
```

### 1.6 语音消息实现

```
录音流程:
1. 用户按住录音按钮 → touchstart/mousedown
2. navigator.mediaDevices.getUserMedia({ audio: true })
3. MediaRecorder 开始录音，Canvas 绘制波形动画
4. 松开/touchend/mouseup → 停止录音
5. Blob(WebM/Opus) → FormData → POST /api/upload/voice
6. 返回 voiceUrl → 通过 WS 发送 voice_message 给接收方

播放流程:
1. HTML5 Audio 标签播放 voiceUrl
2. 波形进度条联动
3. 播放完成自动标记已播放(视觉变化)
```

---

## 二、小红书广场 1:1 还原

### 2.1 现状分析

| 维度 | 当前状态 | 小红书对标 |
|------|:---:|:---:|
| 布局 | 列表/卡片 | **双列瀑布流** + 笔记详情全屏 |
| 内容类型 | 纯文本+图片 | **图文笔记** + **视频笔记** |
| 笔记卡片 | 简单卡片 | 图片封面/视频播放/标题/点赞数/作者头像 |
| 互动方式 | 点赞/评论 | 点赞/收藏/评论/分享/关注 |
| 发现页 | 基础Feed | 个性化推荐流/PGC内容/话题 |
| 发布编辑器 | 简单表单 | 富文本编辑/图片排版/标签/话题/地点 |
| 个人主页 | 列表 | 笔记墙(双列)/收藏夹 |
| 搜索 | 关键词搜索 | 多维度搜索(笔记/话题/用户) |
| 话题标签 | 基础标签云 | 可关注的话题/话题动态/热门话题 |
| 收藏 | 商品收藏 | 笔记收藏+自定义收藏夹 |

### 2.2 数据库新增/修改模型

```prisma
// 1. 扩展现有 Post 模型 → 小红书笔记
model Post {
  // === 现有字段 ===
  id        Int      @id @default(autoincrement())
  userId    Int
  title     String?
  content   String?
  images    String   @default("[]") // JSON array
  status    String   @default("pending")
  viewCount Int      @default(0)
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // === 新增字段 ===
  postType   String   @default("note")   // note|video — 笔记类型
  videoUrl   String?                     // 视频笔记URL
  videoCover String?                     // 视频封面
  videoDuration Int?                     // 视频时长(秒)
  location   String?                     // 位置
  isPinned   Boolean  @default(false)    // 笔记置顶(作者)
  isFeatured Boolean  @default(false)    // 精选推荐(管理员)
  likeCount  Int      @default(0)        // 点赞数(冗余，加速查询)
  commentCount Int    @default(0)        // 评论数(冗余)
  shareCount Int      @default(0)        // 分享数
  saveCount  Int      @default(0)        // 收藏数
  coverIndex Int      @default(0)        // 封面图索引(多图时的默认封面)
  
  // 关系
  user       User     @relation(fields: [userId], references: [id])
  comments   PostComment[]
  tags       PostTag[]
  likes      PostLike[]
  saves      PostSave[]
  
  @@index([userId, status, createdAt])
  @@index([status, createdAt])
  @@index([postType, status])
}

// 2. 笔记点赞(独立表，方便计数和去重)
model PostLike {
  id        Int      @id @default(autoincrement())
  userId    Int
  postId    Int
  createdAt DateTime @default(now())
  
  @@unique([userId, postId])
  @@index([postId])
}

// 3. 笔记收藏
model PostSave {
  id          Int      @id @default(autoincrement())
  userId      Int
  postId      Int
  collectionId Int?    // 所属收藏夹(可选)
  createdAt   DateTime @default(now())
  
  collection  PostCollection? @relation(fields: [collectionId], references: [id])
  
  @@unique([userId, postId])
  @@index([userId])
}

// 4. 收藏夹
model PostCollection {
  id        Int      @id @default(autoincrement())
  userId    Int
  name      String
  isPublic  Boolean  @default(true)
  coverUrl  String?
  postCount Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  saves     PostSave[]
  
  @@index([userId])
}

// 5. 笔记评论扩展
model PostComment {
  // === 现有字段 ===
  id        Int      @id @default(autoincrement())
  userId    Int
  postId    Int
  content   String
  status    String   @default("pending")
  createdAt DateTime @default(now())
  
  // === 新增字段 ===
  replyToId Int?          // 回复的评论ID(二级评论)
  replyTo   PostComment?  @relation("CommentReply", fields: [replyToId], references: [id])
  replies   PostComment[] @relation("CommentReply")
  likeCount Int      @default(0)
  
  @@index([postId, createdAt])
}

// 6. 话题标签(扩展到可关注)
model TopicTag {
  // === 现有字段 ===
  id        Int      @id @default(autoincrement())
  name      String   @unique
  
  // === 新增字段 ===
  coverUrl    String?  // 话题封面
  description String?  // 话题描述
  postCount   Int      @default(0)
  followerCount Int    @default(0)
  isOfficial  Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  posts       PostTag[]
  follows     TagFollow[]
}

model TagFollow {
  id        Int      @id @default(autoincrement())
  userId    Int
  tagId     Int
  createdAt DateTime @default(now())
  
  @@unique([userId, tagId])
}
```

### 2.3 后端 API 新增/修改

| # | 方法 | 路径 | 功能 |
|---|------|------|------|
| 1 | GET | `/api/notes` | 笔记流(瀑布流) `?sort=recommend\|newest\|hot&postType=note\|video&tag=&page=` |
| 2 | GET | `/api/notes/:id` | 笔记详情(含关联推荐) |
| 3 | POST | `/api/notes` | 发布笔记(支持图文/视频) |
| 4 | PUT | `/api/notes/:id` | 编辑笔记 |
| 5 | DELETE | `/api/notes/:id` | 删除笔记(软删除) |
| 6 | POST | `/api/notes/:id/like` | 点赞/取消点赞笔记 |
| 7 | GET | `/api/notes/:id/likes` | 点赞列表 |
| 8 | POST | `/api/notes/:id/save` | 收藏笔记 |
| 9 | DELETE | `/api/notes/:id/save` | 取消收藏 |
| 10 | POST | `/api/notes/:id/share` | 分享笔记(计数) |
| 11 | GET | `/api/collections` | 我的收藏夹列表 |
| 12 | POST | `/api/collections` | 创建收藏夹 |
| 13 | PUT | `/api/collections/:id` | 编辑收藏夹 |
| 14 | DELETE | `/api/collections/:id` | 删除收藏夹 |
| 15 | GET | `/api/collections/:id/notes` | 收藏夹内笔记 |
| 16 | POST | `/api/tags/:id/follow` | 关注话题 |
| 17 | DELETE | `/api/tags/:id/follow` | 取消关注话题 |
| 18 | GET | `/api/tags/:name/feed` | 话题动态流 |
| 19 | GET | `/api/explore` | 发现页推荐流(个性化) |
| 20 | POST | `/api/upload/video` | 上传视频(MP4, ≤100MB) |
| 21 | POST | `/api/upload/video-cover` | 视频封面图 |

### 2.4 前端页面/组件改造

#### 现有页面改造映射

| 现有页面 | 改造目标 | 文件 |
|----------|----------|------|
| `SquarePage.tsx` | → `XhsFeedPage.tsx` | 小红书双列瀑布流 + 上下滑 |
| `PostDetailPage.tsx` | → `NoteDetailPage.tsx` | 笔记全屏详情 + 交互 |
| `PublishPostPage.tsx` | → `NoteEditorPage.tsx` | 富文本编辑器 |
| `TagsPage.tsx` | → `XhsTagsPage.tsx` | 话题广场(可关注) |
| `UserProfilePage.tsx` | → 增强笔记墙展示 | 个人主页双列笔记墙 |

#### 新增页面

| 页面 | 路由 | 功能 |
|------|------|------|
| `ExplorePage` | `/explore` | 发现页(推荐流+话题+精选) |
| `CollectionsPage` | `/collections` | 我的收藏夹管理 |
| `CollectionDetailPage` | `/collections/:id` | 收藏夹内笔记 |
| `XhsSearchPage` | `/search/notes` | 笔记搜索(独立搜索页) |
| `VideoUploadPage` | `/publish/video` | 视频笔记上传 |

#### 核心前端组件 - 瀑布流

```typescript
// 瀑布流实现方案
// 方案: react-masonry-css (CSS Columns) + IntersectionObserver 无限滚动
// 
// 双列布局:
// ┌─────────┬─────────┐
// │ 卡片 1   │ 卡片 2   │
// │ (高)    │         │
// │         │ 卡片 3   │
// │ 卡片 4   │ (矮)     │
// │         ├─────────┤
// ├─────────┤ 卡片 5   │
// │ 卡片 6   │         │
// └─────────┴─────────┘

// 卡片结构:
// ┌─────────────┐
// │ [图片/视频]   │  ← 3:4或1:1比例封面
// │              │
// │ 标题文字...   │  ← 最多2行省略
// │ 👤 昵称  ❤️ 99│  ← 底部信息栏
// └─────────────┘
```

#### 笔记卡片组件笔记

```
NoteCard 组件状态:
- 图片笔记: 单图全幅 / 多图左上角显示图片数量角标
- 视频笔记: 封面+播放图标 / hover时自动播放
- 加载: 骨架屏占位(等宽但高度随机)
- 空状态: 引导发布第一条笔记
- 错误: 卡片内显示刷新按钮
```

#### 笔记详情页布局

```
┌──────────────────────────────┐
│ ← 返回          ⋮ 更多       │  ← 导航栏(半透明, 滑动后变白)
├──────────────────────────────┤
│                              │
│  [图片轮播 — 左右滑动]        │  ← 图片区(可全屏, 双指缩放)
│     ← → 指示器(小圆点)       │
│                              │
├──────────────────────────────┤
│  👤 张三                +关注 │  ← 作者信息
│  3小时前 · 郑州轻工业大学      │
│                              │
│  笔记正文内容...               │  ← 正文(可展开)
│  #话题1  #话题2               │  ← 话题标签
│                              │
│  📍 图书馆三楼                │  ← 位置(可选)
├──────────────────────────────┤
│  ❤️ 999  💬 88  ⭐ 55  📤    │  ← 互动按钮
├──────────────────────────────┤
│  相关笔记(横向滑动)            │  ← 更多推荐
│  ┌───┐ ┌───┐ ┌───┐         │
│  │   │ │   │ │   │         │
│  └───┘ └───┘ └───┘         │
├──────────────────────────────┤
│  热门评论                     │
│  👤 李四: 好棒的分享!          │
│     👍 12  回复               │
│  查看全部评论 →                │
├──────────────────────────────┤
│  [写评论...]           📝      │  ← 底部评论输入栏
└──────────────────────────────┘
```

#### 发现页布局

```
┌──────────────────────────────┐
│  [搜索栏]                     │
├──────────────────────────────┤
│  话题分类横滚条                │
│  [推荐] [校园] [穿搭] [美食]...│
├──────────────────────────────┤
│  ┌──────────┐ ┌──────────┐   │  ← 双列瀑布流
│  │ 精选笔记1  │ │ 精选笔记2  │   │
│  └──────────┘ │          │   │
│  ┌──────────┐ └──────────┘   │
│  │ 精选笔记3  │ ┌──────────┐   │
│  └──────────┘ │ 精选笔记4  │   │
│               └──────────┘   │
└──────────────────────────────┘
```

---

## 三、抖音视频流 1:1 还原

### 3.1 核心功能设计

```
┌──────────────────────────────┐
│                              │
│                              │
│      [全屏视频播放]            │
│                              │
│                              │
├──────────────────────────────┤
│  右侧交互栏(半透明)            │
│    👤 头像(带+关注)           │
│    ❤️ 9.9w                   │  ← 点赞
│    💬 888                    │  ← 评论
│    ⭐ 保存                    │  ← 收藏
│    📤 分享                    │  ← 分享
│    🎵 原声                    │  ← 音乐盘(旋转)
├──────────────────────────────┤
│  底部信息区                    │
│  @作者昵称           [关注]    │
│  视频描述文字...               │
│  #话题1  #话题2               │
│  🎵 背景音乐名称               │
├──────────────────────────────┤
│  顶部导航栏(半透明)            │
│  [同城] [关注] [推荐] [直播]...│  ← Tab切换
│  [搜索🔍]                     │
├──────────────────────────────┤
│  底部进度条                    │
│  ━━━━━━━━━━━○━━━━━━━━━━━━━━  │
│           00:15 / 01:23       │
└──────────────────────────────┘
```

### 3.2 视频流交互逻辑

```
手势交互:
- 上滑: 下一个视频(切换动画)
- 下滑: 上一个视频(切换动画)
- 左滑: 进入作者主页(可选)
- 单击: 暂停/播放
- 双击: 点赞(红心动画)
- 长按: 弹出菜单(不感兴趣/举报/保存)

视频切换动画:
- 使用 CSS transform: translateY 实现平滑过渡
- 预加载: 当前+前一个+后一个(共3个)视频
- 切换方向判断: deltaY > 0 向上(下一个), deltaY < 0 向下(上一个)
- 回弹效果: 到第一个/最后一个时的弹性动画

播放控制:
- 当前视频可见时自动播放
- 不可见时自动暂停
- 使用 Intersection Observer 或手动判断
- 静音按钮(默认小音量, 点击切换)
```

### 3.3 数据库新增模型

```prisma
// 1. 短视频
model ShortVideo {
  id            Int      @id @default(autoincrement())
  userId        Int
  videoUrl      String                    // 视频文件URL
  coverUrl      String                    // 封面图URL
  description   String?                   // 描述
  duration      Int                       // 视频时长(秒)
  width         Int      @default(1080)   // 宽度
  height        Int      @default(1920)   // 高度
  size          Int?                      // 文件大小(bytes)
  
  musicTitle    String?                   // 背景音乐名称
  musicArtist   String?                   // 音乐作者
  musicUrl      String?                   // 音乐URL(可选)
  
  viewCount     Int      @default(0)
  likeCount     Int      @default(0)
  commentCount  Int      @default(0)
  shareCount    Int      @default(0)
  
  status        String   @default("pending")  // pending|approved|rejected
  isFeatured    Boolean  @default(false)      // 精选
  isDeleted     Boolean  @default(false)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id])
  likes         VideoLike[]
  comments      VideoComment[]
  
  @@index([userId, status])
  @@index([status, createdAt])
  @@index([viewCount])
}

// 2. 视频点赞
model VideoLike {
  id        Int      @id @default(autoincrement())
  userId    Int
  videoId   Int
  createdAt DateTime @default(now())
  
  @@unique([userId, videoId])
}

// 3. 视频评论
model VideoComment {
  id        Int      @id @default(autoincrement())
  userId    Int
  videoId   Int
  content   String
  status    String   @default("pending")
  likeCount Int      @default(0)
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  video     ShortVideo @relation(fields: [videoId], references: [id])
  
  @@index([videoId, createdAt])
}

// 4. 视频观看历史
model VideoHistory {
  id        Int      @id @default(autoincrement())
  userId    Int
  videoId   Int
  watchDuration Int   @default(0)  // 观看时长(秒)
  watchedAt DateTime @default(now())
  
  @@unique([userId, videoId])
}

// 5. 视频Tag
model VideoTag {
  id        Int      @id @default(autoincrement())
  videoId   Int
  tagName   String
  
  @@index([tagName])
}
```

### 3.4 后端 API 新增

| # | 方法 | 路径 | 功能 |
|---|------|------|------|
| 1 | GET | `/api/videos/feed` | 视频流(推荐算法) `?tab=recommend\|following\|nearby&page=` |
| 2 | GET | `/api/videos/:id` | 视频详情 |
| 3 | POST | `/api/videos` | 发布视频(标题/描述/话题/音乐) |
| 4 | DELETE | `/api/videos/:id` | 删除视频 |
| 5 | POST | `/api/videos/:id/like` | 点赞/取消点赞 |
| 6 | GET | `/api/videos/:id/comments` | 评论列表 |
| 7 | POST | `/api/videos/:id/comments` | 发表评论 |
| 8 | DELETE | `/api/videos/:id/comments/:cid` | 删除评论 |
| 9 | POST | `/api/videos/:id/view` | 记录观看(更新ViewCount+History) |
| 10 | POST | `/api/videos/:id/share` | 分享计数 |
| 11 | GET | `/api/videos/search` | 视频搜索 |
| 12 | GET | `/api/videos/user/:userId` | 用户的视频列表 |
| 13 | POST | `/api/upload/video` | 上传视频(MP4, ≤100MB) |
| 14 | POST | `/api/upload/video-cover` | 视频封面图 |

### 3.5 推荐算法(简易版)

```
视频推荐策略:
1. 内容协同过滤: 基于用户观看/点赞的视频话题，推荐相似话题视频
2. 热门衰减: 发布时间越近的视频权重越高
3. 多样性: 避免同话题连续出现(每3个视频穿插不同话题)
4. 去重: 排除已观看/不感兴趣的视频

排序公式:
score = (likeCount * 0.4 + commentCount * 0.3 + shareCount * 0.15 + viewCount * 0.15)
        * timeDecay(1 / (1 + hoursAgo * 0.01))
        * interactionBoost(userFollowed ? 1.5 : 1)
```

### 3.6 前端核心组件

| 组件 | 文件 | 功能 |
|------|------|------|
| `VideoFeed` | `components/video/VideoFeed.tsx` | 全屏视频流(滑动切换+预加载) |
| `VideoPlayer` | `components/video/VideoPlayer.tsx` | 单个视频播放器(控制栏+手势) |
| `VideoSidebar` | `components/video/VideoSidebar.tsx` | 右侧互动按钮(点赞/评论/分享) |
| `VideoInfo` | `components/video/VideoInfo.tsx` | 底部信息区(作者/描述/话题/音乐) |
| `VideoComments` | `components/video/VideoComments.tsx` | 评论面板(从底部滑入) |
| `VideoProgress` | `components/video/VideoProgress.tsx` | 底部进度条 |
| `VideoTabBar` | `components/video/VideoTabBar.tsx` | 顶部Tab(推荐/关注/同城) |
| `LikeAnimation` | `components/video/LikeAnimation.tsx` | 双击点赞红心动画 |
| `MusicDisc` | `components/video/MusicDisc.tsx` | 旋转音乐光盘图标 |
| `VideoSkeleton` | `components/video/VideoSkeleton.tsx` | 视频加载骨架屏 |
| `VideoUploadForm` | `components/video/VideoUploadForm.tsx` | 视频上传表单 |

---

## 四、跨模块共享基础设施

### 4.1 需要升级的共享能力

| 能力 | 现有状态 | 升级后 |
|------|:---:|------|
| 文件上传 | 图片/文档 | +语音(WebM) +视频(MP4) |
| WebSocket | 私信/typing | +通话信令 +WeRTC SDP/ICE |
| 通知系统 | 基础通知 | +来电通知 +笔记互动通知 +视频互动通知 |
| 搜索系统 | 全站搜索 | +笔记搜索 +视频搜索 +聊天记录搜索 |
| 图片处理 | Sharp压缩 | +视频转码(FFmpeg) +视频封面抽取 |
| 内容审核 | 文本+图片 | +视频审核(封面) +语音审核 |
| 性能优化 | 基础 | +CDN视频 +预加载 +虚拟列表 |

### 4.2 新增依赖

```json
// 后端新增
{
  "fluent-ffmpeg": "^2.1.3",     // 视频转码/封面抽取
  "@ffmpeg-installer/ffmpeg": "^1.1.0", // FFmpeg二进制
  "react-masonry-css": "^1.0.16" // (前端) 瀑布流布局
}
```

### 4.3 视频处理流程

```
视频上传 → Multer接收 → 魔术字节验证
    → FFmpeg转码: H.264/AAC, 720p, CRF 23
    → FFmpeg抽取封面: 第1秒帧 → Sharp压缩(800px WebP)
    → 保存视频文件 → 返回 videoUrl + coverUrl
    → 创建审核记录
```

---

## 五、任务拆分总览

按照分模块、分轮次迭代的原则，将整个工程拆分为 **6个大阶段、约70个子任务**：

### 阶段一: 微信私信基础体验 (任务1-15)
1. 数据库: 扩展 ChatMessage 模型 + 新增 ConversationSetting/CallRecord/Sticker 模型
2. 后端: 消息撤回/已读回执/送达状态 API
3. 后端: 语音上传 API + 文件消息 API
4. 前端: MessageBubble 组件(统一气泡)
5. 前端: VoiceRecorder + VoicePlayer 组件
6. 前端: ChatToolbar 重构(输入框+录音+表情+加号)
7. 前端: AttachmentMenu 组件(相册/文件/位置/名片)
8. 前端: 消息引用/回复功能
9. 前端: 消息撤回功能
10. 前端: 已读回执图标(单勾→双勾→蓝勾)
11. 前端: 消息长按菜单(ContextMenu)
12. 前端: 聊天背景自定义
13. 前端: 会话置顶/免打扰
14. 前端: 聊天记录搜索面板
15. 前端: 聊天设置页

### 阶段二: 微信通话系统 (任务16-25)
16. 后端: 通话信令 API(发起/接听/拒接/结束)
17. 后端: 通话记录存储
18. 后端: WebSocket 扩展(WebRTC 信令转发)
19. 前端: VoiceCallUI 组件(拨打/响铃/通话中)
20. 前端: VideoCallUI 组件(全屏视频通话)
21. 前端: 通话状态机(空闲→呼叫中→响铃→通话中→结束)
22. 前端: WebRTC 连接管理(PeerConnection + ICE)
23. 前端: 通话通知(来电横幅/锁屏通知)
24. 前端: 通话记录列表页
25. 通话系统集成测试

### 阶段三: 小红书瀑布流 (任务26-40)
26. 数据库: 扩展 Post 模型 + 新增 PostLike/PostSave/PostCollection/TagFollow 模型
27. 后端: 笔记流 API(瀑布流分页)
28. 后端: 笔记详情 API(含关联推荐)
29. 后端: 点赞/收藏/分享计数 API
30. 后端: 收藏夹 CRUD API
31. 后端: 话题关注/取消关注 API
32. 前端: MasonryWaterfall 瀑布流组件
33. 前端: NoteCard 组件(图片/视频封面+标题+互动)
34. 前端: NoteDetailPage 笔记详情页(全屏滑动)
35. 前端: NoteEditorPage 富文本编辑器
36. 前端: NoteLike/Save/Share 互动按钮
37. 前端: ExplorePage 发现页(推荐流)
38. 前端: CollectionsPage 收藏夹管理
39. 前端: 话题广场 + 话题Feed
40. 前端: 个人主页笔记墙

### 阶段四: 抖音视频流 (任务41-55)
41. 数据库: 新增 ShortVideo/VideoLike/VideoComment/VideoHistory/VideoTag 模型
42. 后端: 视频上传 API(FFmpeg转码+封面抽取)
43. 后端: 视频流 API(推荐算法)
44. 后端: 视频点赞/评论/分享 API
45. 后端: 观看历史记录 API
46. 前端: VideoFeed 全屏视频流组件
47. 前端: VideoPlayer 播放器(手势+控制)
48. 前端: VideoSidebar 互动按钮(点赞/评论/分享)
49. 前端: VideoInfo 底部信息区
50. 前端: VideoComments 评论面板(底部滑入)
51. 前端: 视频预加载策略(前中后3个)
52. 前端: 双击点赞动画
53. 前端: 视频Tab切换(推荐/关注/同城)
54. 前端: 视频搜索页
55. 前端: 视频上传页

### 阶段五: 集成与路由整合 (任务56-65)
56. 底部导航栏重构(加入视频Tab)
57. 广场入口改为小红书风格
58. 发现页入口
59. 视频流入口(独立Tab或广场内Tab)
60. 全局搜索增强(支持笔记+视频+聊天记录)
61. 通知系统增强(笔记互动+视频互动+通话记录)
62. 个人中心增强(我的笔记/我的视频/收藏夹入口)
63. 管理后台增强(视频审核/笔记审核)
64. 跨模块链接(聊天→视频通话, 笔记→作者私信, 视频→评论者私信)
65. 路由守卫+权限梳理

### 阶段六: 测试与优化 (任务66-70)
66. 端到端测试: 微信私信全流程
67. 端到端测试: 小红书笔记发布→浏览→互动
68. 端到端测试: 抖音视频上传→浏览→互动
69. 性能优化(瀑布流虚拟滚动、视频预加载、图片懒加载)
70. 全量回归测试(确保旧功能不受影响)

---

## 六、注意事项

### 法律合规
- ⚠️ 视频通话功能**仅限一对一**，不做多人/直播(需要增值电信许可证)
- ⚠️ 视频内容审核必须接入AI，上线前做好内容过滤
- ⚠️ 用户上传视频需确认"我已阅读并同意《用户协议》"
- ⚠️ 短视频功能属于"网络视听"业务，需在用户协议中声明

### 技术风险
- ⚠️ WebRTC 在校园网NAT环境下可能P2P不通，需部署TURN服务器
- ⚠️ FFmpeg 视频转码非常消耗CPU，单个视频建议异步转码+队列
- ⚠️ 短视频存储成本高，建议限制上传大小(100MB)和时长(60秒)
- ⚠️ 瀑布流大量图片可能造成内存问题，需懒加载+虚拟化
- ⚠️ 视频预加载不能超过3个(防止流量浪费和内存溢出)

### 设计原则
- ⚠️ 所有UI修改后必须重启验证，确保效果符合预期
- ⚠️ 保持"轻陶"品牌色(indigo)和设计语言一致性
- ⚠️ 新增功能不破坏现有功能(回归验证)
- ⚠️ 所有API返回格式保持 `{ code, message, data }` 统一规范
- ⚠️ 移动端优先设计，PC端做适配但不做主要优化
