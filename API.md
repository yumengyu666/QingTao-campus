# 轻淘 API 文档

> 所有接口返回统一格式：`{ code: number, message: string, data: any }`

## 通用约定

- **Base URL**: `/api`
- **认证**: 需要登录的接口在 Header 中传 `Authorization: Bearer <token>`
- **分页响应**: `{ code: 200, data: { list: T[], total: number, page: number, pageSize: number, totalPages: number } }`
- **错误码**: 200/201 成功 | 400 参数错误 | 401 未登录 | 403 无权限 | 404 不存在 | 413 文件过大 | 429 请求过频 | 500 服务器错误

---

## 认证 /api/auth

### POST /api/auth/register
注册新用户（需验证码）
- Body: `{ username, password, captchaId, captchaAnswer }`
- 返回 201: `{ token, refreshToken, user: { id, username, nickname, ... } }`

### POST /api/auth/login
登录
- Body: `{ username, password, captchaId, captchaAnswer }`
- 返回 200: `{ token, refreshToken, user: { id, username, nickname, ... } }`
- 错误 401: `"用户名或密码错误"` | `"验证码错误或已过期"`

### POST /api/auth/refresh
刷新 Token
- Body: `{ refreshToken }`
- 返回 200: `{ token, refreshToken }`

### GET /api/auth/me
获取当前用户信息（需登录）
- 返回 200: `{ id, username, nickname, avatarUrl, role, ... }`

### POST /api/auth/forgot-password
忘记密码 → 引导至安全提问验证
- Body: `{ username }`
- 返回 200: `{ hasSecurityQuestions, username }`

### POST /api/auth/verify-questions
验证安全提问 → 获取重置码
- Body: `{ username, answer1, answer2, answer3 }`
- 需至少答对 2 题
- 返回 200: `{ resetCode }`（开发环境）

### POST /api/auth/reset-password
使用重置码设置新密码
- Body: `{ username, code, newPassword }`
- 返回 200

---

## 用户 /api/users

### GET /api/users/:id
用户公开信息（可选认证）
- 返回: `{ id, nickname, avatarUrl, bio, campusArea, followCount, fansCount, goodsCount, postsCount, isFollowing }`
- 登录后可见联系方式（wechat/qq）

### GET /api/users/:id/goods
用户发布的商品
- 返回分页: `{ list: Goods[], total, page, pageSize }`

### GET /api/users/:id/posts
用户发布的帖子

### GET /api/users/:id/followers
粉丝列表

### GET /api/users/:id/following
关注列表

### POST /api/users/:id/follow
关注用户（需登录）

### DELETE /api/users/:id/follow
取消关注（需登录）

### PUT /api/users/profile
修改个人资料（需登录）
- Body: `{ nickname?, avatarUrl?, wechat?, qq?, bio?, campusArea? }`
- 返回 200

### PUT /api/users/password
修改密码（需登录）
- Body: `{ oldPassword, newPassword }`

### DELETE /api/users/me
注销账号（需登录）

### GET /api/users/profile/changes
获取待审资料修改（需登录）

### GET /api/users/security-questions
获取已设置的安全提问（需登录）

### PUT /api/users/security-questions
设置安全提问（需登录）
- Body: `{ question1, answer1, question2, answer2, question3, answer3 }`

### GET /api/users/:username/questions
获取某用户的安全提问（用于找回密码）

---

## 商品 /api/goods

### GET /api/goods
商品列表
- Query: `categoryId?, listType?, campus?, sort?, order?, keyword?, condition?, priceMin?, priceMax?, page?, pageSize?`
- status 筛选: 默认 `approved | sold | pending`
- 返回分页: `{ list: Goods[], total, page, pageSize, totalPages }`

### GET /api/goods/newest
最新发布（首页用，包含 pending）
- Query: `categoryId?, campus?, listType?, page?, pageSize?`

### GET /api/goods/hot
热门推荐（去重 newest）
- Query: 同上

### GET /api/goods/:id
商品详情
- 未登录不返回卖家联系方式
- 返回: `{ id, title, price, images, description, condition, campus, user, categoryName, _aiFlagged, ... }`

### POST /api/goods
发布商品（需登录）
- Body: `{ title, categoryId, price, description?, images?, listType?, condition?, campus?, originalPrice?, deposit?, rentStart?, rentEnd?, campusLocation? }`
- 返回 201

### PUT /api/goods/:id
编辑商品（仅作者）
- Body: 同 POST，只传需修改的字段
- 只对新图片重新审核

### DELETE /api/goods/:id
删除商品（仅作者）

### PATCH /api/goods/:id/sold
标记已售（仅作者）

### PATCH /api/goods/:id/unsell
取消已售标记（仅作者）

### PATCH /api/goods/:id/offline
下架商品（仅作者）

### PATCH /api/goods/:id/relist
重新上架（仅作者）

### GET /api/goods/:id/comments
商品评论

### POST /api/goods/:id/comments
发表评论（需登录）
- Body: `{ content }`

### DELETE /api/goods/:id/comments/:commentId
删除评论（作者或管理员）

---

## 购物车 /api/cart

### GET /api/cart
购物车列表（需登录）

### GET /api/cart/count
购物车数量（需登录）

### POST /api/cart
加入购物车（需登录）
- Body: `{ goodsId }`
- 不能加自己的商品，不能加已售商品

### DELETE /api/cart/:id
移除购物车项（需登录）

---

## 收藏 /api/favorites

### GET /api/favorites
收藏列表（需登录）

### GET /api/favorites/check/:goodsId
检查是否已收藏（需登录）
- 返回: `{ favorited: boolean }`

### POST /api/favorites
收藏（需登录）
- Body: `{ goodsId }`

### DELETE /api/favorites/:id
取消收藏（需登录）

---

## 帖子 /api/posts

### GET /api/posts
帖子列表
- Query: `page?, pageSize?, keyword?, sort?`

### GET /api/posts/:id
帖子详情

### POST /api/posts
发布帖子（需登录）
- Body: `{ title, content?, images? }`

### PUT /api/posts/:id
编辑帖子（仅作者）

### DELETE /api/posts/:id
删除帖子（仅作者）

### GET /api/posts/:id/comments
帖子评论

### POST /api/posts/:id/comments
发表评论（需登录）

### DELETE /api/posts/:id/comments/:commentId
删除评论

---

## 失物招领 /api/lostfound

### GET /api/lostfound
失物招领列表
- Query: `type?, keyword?, campus?, page?, pageSize?`

### GET /api/lostfound/:id
失物招领详情

### POST /api/lostfound
发布失物招领（需登录）
- Body: `{ type, title, description?, location, lostTime?, images?, contactWechat?, contactQq?, reward?, campus? }`

### PUT /api/lostfound/:id
编辑（仅作者）

### DELETE /api/lostfound/:id
删除（仅作者）

### PATCH /api/lostfound/:id/resolve
标记已解决（仅作者）

### GET /api/lostfound/:id/comments
评论列表

### POST /api/lostfound/:id/comments
发表评论（需登录）

### DELETE /api/lostfound/:id/comments/:commentId
删除评论

---

## 私信 /api/messages

### GET /api/messages/conversations
会话列表（需登录）
- 返回: `[{ userId, nickname, avatarUrl, lastMessage, lastTime, unread }]`

### GET /api/messages/unread-count
未读消息总数（需登录）
- 返回: `{ count }`

### GET /api/messages/:userId
与指定用户的消息（需登录）
- Query: `page?, pageSize?`
- 自动标记对方消息为已读

### POST /api/messages/:userId
发送消息（需登录）
- Body: `{ content, type? }`
- 未互关限制 10 条，互关后无限制
- AI 异步审核

---

## 恋爱空间 /api/dating

### GET /api/dating/profile
获取匿名身份（需登录）

### POST /api/dating/profile
创建/更新匿名身份（需登录）
- Body: `{ nickname?, gender?, bio?, contactWechat?, contactQq?, customAvatar? }`

### GET /api/dating/daily-match
获取今日缘分（需登录）
- 返回: `{ matched, matchId?, revealed?, peer?, relationshipDays? }`

### POST /api/dating/daily-match/:id/reveal
确认互相认识（需登录）

### GET /api/dating/posts
恋爱动态（需登录）

### POST /api/dating/posts
发布动态（需登录）
- Body: `{ content }`

### PUT /api/dating/posts/:postId
编辑动态（仅作者）

### DELETE /api/dating/posts/:postId
删除动态（仅作者）

### GET /api/dating/following
关注列表（需登录）

### POST /api/dating/:userId/follow
关注用户（需登录）

### DELETE /api/dating/:userId/follow
取消关注（需登录）

### POST /api/dating/:userId/request
发送恋爱请求（需登录）

### GET /api/dating/requests
恋爱请求列表（需登录）

### PATCH /api/dating/requests/:requestId
处理请求（需登录）
- Body: `{ status: "accepted" | "rejected" }`

### DELETE /api/dating/relationship/:userId
解除恋爱关系（需登录）

### GET /api/dating/conversations
恋爱私信会话（需登录）

### GET /api/dating/messages/:userId
与指定用户的恋爱私信（需登录）

### POST /api/dating/messages/:userId
发送恋爱私信（需登录）
- Body: `{ content }`

---

## 树洞 /api/treehole

### GET /api/treehole
树洞列表（可选认证）
- Query: `page?, pageSize?, sort?`
- sort: `newest` | `hot`

### POST /api/treehole
匿名发帖
- Body: `{ content, images? }`
- 返回: `{ id, code, content, ... }`（code 是匿名码）

### GET /api/treehole/:id
树洞详情

### POST /api/treehole/:id/comments
匿名评论
- Body: `{ content }`

### POST /api/treehole/:id/like
点赞/取消赞（IP 去重）
- Body: `{ action: "like" | "unlike" }`

---

## 校园答疑 /api/qa

### GET /api/qa
问答列表
- Query: `page?, pageSize?, category?, type?, sort?`

### GET /api/qa/:id
问题详情

### POST /api/qa
发布问题（需登录）
- Body: `{ title, content?, category?, images? }`

### POST /api/qa/:id/answers
回答问题（需登录）
- Body: `{ content, images? }`

### POST /api/qa/answers/:id/vote
点赞/取消赞回答（需登录）

### POST /api/qa/answers/:id/best
采纳最佳回答（仅提问者）

---

## 考试资料 /api/resources

### GET /api/resources
资料列表
- Query: `page?, pageSize?, keyword?, type?, courseName?`

### GET /api/resources/:id
资料详情（自动增加下载计数）

### POST /api/resources
上传资料（需登录）
- Body: multipart form — `file, courseName, title, type?, description?`

### PUT /api/resources/:id
编辑资料（仅作者）

### DELETE /api/resources/:id
删除资料（作者或管理员）

### POST /api/resources/:id/like
点赞资料（需登录）

---

## 搜索 /api/search

### GET /api/search
全站搜索
- Query: `keyword, type?, page?`
- type: `goods` | `post` | `lostfound` | `users`
- 不传 type 搜索全部

### GET /api/search/hot
热门搜索词（近 7 天）

---

## 通知 /api/notifications

### GET /api/notifications
通知列表（需登录）
- Query: `page?, type?`

### GET /api/notifications/unread-count
未读通知数（需登录）

### GET /api/notifications/announcements
公告列表（公开）

### PATCH /api/notifications/read-all
全部标记已读（需登录）

### PATCH /api/notifications/batch-read
批量已读（需登录）
- Body: `{ ids: number[] }`

### PATCH /api/notifications/:id/read
标记已读（需登录）

### DELETE /api/notifications/batch
批量删除（需登录）
- Body: `{ ids: number[] }`

### DELETE /api/notifications/:id
删除通知（需登录）

---

## 分类 /api/categories

### GET /api/categories
分类列表
- 返回: `[{ id, name, icon, sortOrder }]`

---

## 上传 /api/upload

### POST /api/upload/image
上传图片（需登录）
- multipart: `images` (最多 9 张，单张 ≤5MB)
- 返回: `{ urls: string[] }`
- 自动生成缩略图 + 创建审核记录

### POST /api/upload/file
上传文件（需登录）
- multipart: `file` (≤20MB)
- 支持: pdf/doc/docx/xls/xlsx/ppt/pptx/zip/rar/7z/txt/md/csv

### POST /api/upload/avatar
上传头像（需登录）
- multipart: `avatar` (≤5MB)

---

## 拉黑 /api/block

### GET /api/block
黑名单列表（需登录）

### POST /api/block/:userId
拉黑用户（需登录）

### DELETE /api/block/:userId
解除拉黑（需登录）

---

## 举报 /api/reports

### POST /api/reports
提交举报（需登录）
- Body: `{ targetType, targetId, reason }`
- targetType: `goods` | `post` | `lostfound` | `user`

---

## 其他

### GET /api/banners
轮播图列表

### GET /api/captcha/generate
生成验证码
- 返回: `{ captchaId, svg }`

### GET /api/images/status
查询图片审核状态（需登录）
- Query: `ids` (逗号分隔)

---

## 管理后台 /api/admin

所有管理接口需 `admin` 角色。

### GET /api/admin/stats
统计概览
- 返回: `{ totalUsers, totalGoods, totalPosts, newUsersToday, newGoodsToday, newPostsToday, pendingTotal, ... }`

### GET /api/admin/users
用户列表
- Query: `page?, keyword?, status?`

### PATCH /api/admin/users/:id/status
启用/禁用用户

### DELETE /api/admin/users/:id
删除用户

### GET /api/admin/images
图片审核列表
- Query: `status?, page?`

### POST /api/admin/images/:id/approve
通过图片审核

### POST /api/admin/images/:id/reject
拒绝图片
- Body: `{ reason? }`

### POST /api/admin/categories
创建分类

### PUT /api/admin/categories/:id
更新分类

### DELETE /api/admin/categories/:id
删除分类

### POST /api/admin/announcements
发布公告
- Body: `{ title, content? }`

### GET /api/admin/reports
举报列表

### POST /api/admin/reports/:id/handle
处理举报
- Body: `{ action: "dismiss" | "delete_content" | "ban_user" }`

### GET /api/admin/content/pending
待审内容

### POST /api/admin/content/:type/:id/approve
通过内容审核

### POST /api/admin/content/:type/:id/reject
拒绝内容

### POST/GET/PUT/DELETE /api/admin/banners*
轮播图 CRUD
