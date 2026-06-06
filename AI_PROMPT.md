# 轻淘 — 前端登录页面（React）开发提示词

> 把这份提示词和下面的代码片段给任意 AI，即可生成可用的登录页面。

---

## 技术栈

```
React 19 + TypeScript
Vite 构建
Tailwind CSS 4 样式
Zustand 状态管理
react-hot-toast 消息提示
react-router-dom 路由
react-icons (Feather Icons) 图标
```

---

## 已有项目约定（必须遵守）

### 1. HTTP 请求：用 `apiFetch` 而不是 `fetch`

```typescript
// 文件位置: @/utils/api.ts
import { apiFetch } from '@/utils/api';

// apiFetch 用法：和 fetch 一样，但会自动附加 Authorization header
// 返回原生 Response 对象，调用者自己 .json()
const res = await apiFetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password, captchaId, captchaAnswer }),
});
const json = await res.json();
// json 格式固定: { code: number, message: string, data: any }
```

### 2. 登录成功后设置认证状态

```typescript
// 文件位置: @/stores/authStore.ts
import { useAuthStore } from '@/stores/authStore';

const setAuth = useAuthStore((s) => s.setAuth);
// 用法：
setAuth(token, user, refreshToken);
// token: string — JWT access token
// user: object — 用户对象（见下方 User 类型）
// refreshToken: string — JWT refresh token（可选但建议传）
```

### 3. 表单校验

```typescript
// 文件位置: @/utils/validators.ts
import { validateUsername, validatePassword } from '@/utils/validators';

// validateUsername(username): 返回错误字符串或 null
// validatePassword(password): 返回错误字符串或 null
```

### 4. 验证码组件

```typescript
// 文件位置: @/components/common/MathCaptcha.tsx
import { MathCaptcha } from '@/components/common/MathCaptcha';

// 用法：
<MathCaptcha
  onCaptchaReady={(captchaId: string, answer: string) => {
    // 用户输入完 4 位验证码后触发
    // captchaId: 验证码 ID，提交时传给后端
    // answer: 用户输入的答案（已大写）
  }}
  onCaptchaChange={() => {
    // 用户点击刷新验证码时触发
  }}
/>
// 组件内部自动调用 GET /api/captcha/generate 获取 SVG
```

### 5. Toast 提示

```typescript
import toast from 'react-hot-toast';
toast.success('登录成功');
toast.error('用户名或密码错误');
```

### 6. 路由跳转

```typescript
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/', { replace: true });           // 普通用户跳首页
navigate('/admin', { replace: true });      // 管理员跳后台
```

---

## 后端接口

### 登录接口

```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "username": "string",       // 必填，2-20位
  "password": "string",       // 必填，6-50位
  "captchaId": "string",      // 必填，MathCaptcha 组件提供
  "captchaAnswer": "string"   // 必填，MathCaptcha 组件提供
}

Response 200 (成功):
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGci...",        // JWT access token
    "refreshToken": "eyJhbGci...", // JWT refresh token
    "user": {
      "id": 1,
      "username": "zhangsan",
      "nickname": "张三",
      "avatarUrl": "",
      "wechat": "",
      "qq": "",
      "bio": "",
      "campusArea": "kexue",
      "role": "user",           // "user" | "admin"
      "status": "active",
      "tokenVersion": 0,
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  }
}

Response 4xx (失败):
{
  "code": 400,
  "message": "用户名或密码错误",   // 或其他错误信息
  "data": null
}
```

### 验证码接口

```
GET /api/captcha/generate

Response 200:
{
  "code": 200,
  "data": {
    "captchaId": "abc123",    // 提交登录时用
    "svg": "<svg>...</svg>"   // SVG 字符串，MathCaptcha 组件内部已处理
  }
}
```

---

## 页面要求

### 布局

```
┌──────────────────────────────────┐
│                                  │
│        [背景图片 + 半透明遮罩]      │
│                                  │
│        ┌──────────────────┐      │
│        │   [Logo]          │      │
│        │   轻淘             │      │
│        │   郑州轻工业大学    │      │
│        │                   │      │
│        │  [用户名输入框]     │      │
│        │  [密码输入框]       │      │
│        │  [数学验证码组件]    │      │
│        │  [✓] 我已阅读...    │      │
│        │  [登录按钮]         │      │
│        │                   │      │
│        │  还没有账号？去注册   │      │
│        └──────────────────┘      │
│                                  │
└──────────────────────────────────┘
```

### 交互要求

1. **背景**：全屏背景图片 `/login-bg.png`，上加 `bg-black/40` 半透明黑色遮罩
2. **卡片**：白色圆角卡片，居中显示。移动端 `max-w-sm`，桌面端居中
3. **响应式**：小窗口时卡片可滚动（`max-h-[95dvh] overflow-y-auto`），不被键盘遮挡
4. **验证码**：使用 MathCaptcha 组件即可（4 位字母+数字，右边有刷新按钮）
5. **责任告知书**：复选框 + 链接文字，点击链接弹出全屏 Modal（法律责任文本），Modal 底部有 8 秒倒计时按钮
6. **登录按钮**：用户名、密码、验证码、复选框 全部满足才可点击，点击后显示 "登录中..."
7. **错误处理**：401/400 显示后端返回的错误消息，网络错误显示"网络错误"
8. **封号处理**：URL 参数 `?banned=1` 时，卡片上方显示红色封禁提示 + 联系邮箱 `2306524741@qq.com`
9. **登录成功**：`setAuth(token, user, refreshToken)`，然后 admin 跳 `/admin`，普通用户跳 `/`

### 边界状态

| 状态 | 处理 |
|------|------|
| 加载中 | 登录按钮显示 "登录中..." + disabled |
| 用户名/密码为空 | 按钮 disabled |
| 验证码未完成 | 按钮 disabled |
| 复选框未勾选 | 按钮 disabled |
| 后端返回错误 | toast 显示 `json.message` |
| 网络错误 | toast 显示 "网络错误" |
| 账号被封 | 红色提示框 + 管理员邮箱 |
| 小窗口 | 卡片 `max-h-[95dvh] overflow-y-auto` |

---

## User 类型定义（参考）

```typescript
interface User {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string;
  wechat: string;
  qq: string;
  bio: string;
  campusArea: string;       // "kexue" | "dongfeng"
  role: "user" | "admin";
  status: "active" | "disabled";
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 现有相似页面参考

项目中 `@/pages/auth/RegisterPage.tsx` 的布局和结构与登录页高度相似，可以作为样式参考。

---

## 总结：给 AI 的一句话提示词

```
请用 React 19 + TypeScript + Tailwind CSS 4 写一个登录页面组件。
路由是 /login。
调用 POST /api/auth/login 登录（参数: username, password, captchaId, captchaAnswer），
成功后用 useAuthStore().setAuth(token, user, refreshToken) 保存登录态，
管理员跳 /admin，普通用户跳 /。
使用 @/components/common/MathCaptcha 组件做验证码。
使用 @/utils/api 的 apiFetch 发请求。
使用 react-hot-toast 做提示。
背景图 /login-bg.png，卡片居中，移动端 max-w-sm。
需要责任告知书弹窗（8秒倒计时）。
支持 ?banned=1 显示封号提示。
需要处理加载态、空状态、错误提示。
```

---

## 注意

- 不要用原生 `fetch`，用 `apiFetch`（它会自动带 Authorization header）
- 不要自己写验证码，用 `MathCaptcha` 组件
- Toast 用 `react-hot-toast` 不是别的库
- 样式用 Tailwind CSS 4，不要写 CSS 文件
- 不要用第三方 UI 库（如 Ant Design、MUI）
- 路由跳转用 `useNavigate`，不用 `<a>` 标签
