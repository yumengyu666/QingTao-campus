# 轻淘 用户视角功能问题报告

> 审查日期: 2026-06-02 | 方法: 前端代码审查 + API行为验证

---

## 🔴 P0 — 影响用户核心体验

### 1. 商品列表显示不一致：看得到 / 看不到同一个商品

| 位置 | 显示 pending 商品? |
|------|:---:|
| `/api/goods` (主浏览列表) | ❌ 只看 approved+sold |
| `/api/goods/newest` (最新上架) | ✅ 看 approved+pending |
| `/api/goods/hot` (热门) | ✅ 看 approved+pending |
| 个人商品列表 (自己) | ✅ 全部可见 |
| 他人商品列表 | ❌ 只看 approved+sold |

**影响**: 用户发布商品后，出现在"最新上架"但主浏览页找不到。用户困惑"我的商品去哪了？"

**根因**: `goods.controller.ts:62` 默认过滤 `approved+sold`，但 `:126` `:159` 的 `getNewest`/`getHot` 包含 `pending`

### 2. 发布提示文案与实际行为矛盾

**PublishGoodsPage.tsx 底部提示**:
> "提交审核后公开展示"

**API 实际返回**:
> `message: "已提交审核，通过后将公开展示"`

**实际行为**: 商品立刻出现在 newest/hot 列表中（status=pending），但不会出现在主浏览列表

**影响**: 用户不知道自己发布后商品到底"展示"了还是没有，文案误导

### 3. GoodsDetailPage `_aiFlagged` 字段永远为 undefined

```typescript
// GoodsDetailPage.tsx:352
{goods.status === 'offline' && (goods as any)._aiFlagged !== false && (
  <span>AI审核未通过</span>
)}
```

**问题**: 后端从不返回 `_aiFlagged` 字段。下架原因可能是 seller 手动下架、AI 审核下架等多种原因。前端无法区分，只要有 `status=offline` 就显示"AI审核未通过"标签。

**实际表现**: 用户手动下架商品后，回来看到自己的商品显示"AI审核未通过"标签（误导）

---

## 🟡 P1 — 功能可用但体验较差

### 4. 重复关注返回 400 错误（非幂等）

- `user.controller.ts:150`: `return error(res, '已关注该用户')` — code=400
- 前端没有特殊处理，用户看到红色 toast "已关注该用户"
- 建议: 返回 200 和 `success(res, null, '已关注该用户')`，让前端走绿toast

### 5. Category 对象不一致：列表有，详情没有

| 接口 | category 格式 |
|------|-------------|
| `/api/goods` 列表 | `{ category: { name, icon } }` |
| `/api/goods/:id` 详情 | `{ categoryName, categoryIcon }` (category=undefined) |
| `/api/users/:id/goods` | 同上，category=undefined |

**影响**: 前端组件要处理两种格式。GoodsListPage 用 `goods.category?.name`，GoodsDetailPage 用 `goods.categoryName`

### 6. GoodsDetailPage 未处理未登录状态

`GoodsDetailPage` 不管有没有 token 都走 `apiFetch` — 通过 `apiFetch` 的自动附加 header。但收藏/购物车检查 `if (token)` 保护，页面加载不区分登录态。未登录用户看商品详情会看到收藏和加购按钮但点击无效（因为没有 token），相对友好。

---

## 🟢 P2 — 轻微问题

### 7. LoginPage 封禁详情按钮未绑定

```typescript
const [showBanDetail, setShowBanDetail] = useState(false);
```
声明了但从未在 UI 中使用。封禁弹窗始终只显示基本信息，用户无法展开更多细节。

### 8. GoodsDetailPage 卖家联系信息样式问题

- Line 346: sale 和 rent 的标签都使用 `bg-green-50 text-green-600` — 两者颜色相同（照设计应该没问题，sale 和 rent 都是"出"的类型）
- 但 line 347: rent_want 和 buy 都使用红色 — 符合设计

### 9. ChatPage 10条限制的提示时机

`messages.controller.ts:163` 返回 `"消息已达上限（10条），互关后可无限发送"` — 这个提示在发送失败时才显示。用户可能在第 8, 9, 10 条时并不知道限额即将用完。前端没有显示剩余次数。

---

## 📊 已验证正确的逻辑（值得肯定）

| 功能 | 验证结果 |
|------|:---:|
| 私信10条限制+互关后无限 | ✅ 实现正确 |
| 拉黑后拦截消息 | ✅ 实现正确 |
| 非作者不能修改商品 | ✅ 实现正确 |
| adminMiddleware 正确拦截 | ✅ |
| 敏感词 Layer 1 发布前拦截 | ✅ |
| AI 审核异步+通知+恢复扫描 | ✅ 设计完整 |
| 图片模糊图+管理员审核 | ✅ |
| 恋爱区四层隐私规则 | ✅ |
| Token 刷新+密码修改无效化 | ✅ |
| 关注创建通知 | ✅ |
| 搜索日志记录 | ✅ |
| 忘记密码安全问答流程 | ✅ |
| 重复注册/重复收藏防御 | ✅ |
| 禁言用户内容自动 pending | ✅ |

---

## 🔧 建议修复优先级

1. **修复商品状态不一致**: `getGoodsList` 默认 filter 改为 `status: { in: ['approved', 'pending', 'sold'] }` 并排除 `offline` — 实现真正的"先发后审"
2. **修复 _aiFlagged**: 后端在 goods 返回时附加 `_aiFlagged` 字段，或前端改为检查 `reviewComment` 字段
3. **统一发布提示文案**: 去掉"提交审核后公开展示" → 改为"已发布"
4. **Category 结构统一**: 列表和详情使用相同结构
5. **重复关注幂等**: 返回 200
