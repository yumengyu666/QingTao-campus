# 轻淘 · 设计系统 v4.0

> QingTao Campus Design System — 郑州轻工业大学校园平台
> 更新日期：2026-06-12 | 状态：✅ 完成

---

## 📐 设计概览

本设计系统为「轻淘」校园平台提供完整的视觉语言、组件库和使用规范。设计遵循以下核心原则：

- **一致性**：所有界面使用统一的设计令牌（Design Tokens）
- **可访问性**：满足 WCAG 2.1 AA 标准（4.5:1 对比度）
- **响应式**：移动优先，支持 320px-1920px 全尺寸适配
- **性能优先**：CSS 变量驱动，无运行时开销

---

## 🎨 颜色系统

### 品牌色（Indigo 靛蓝）

| 色阶 | Hex | 用途 |
|------|-----|------|
| `--color-indigo-50` | `#eef2ff` | 品牌背景 |
| `--color-indigo-500` | `#6366f1` | 主品牌色 |
| `--color-indigo-600` | `#4f46e5` | 悬停态 |
| `--color-indigo-700` | `#4338ca` | 深色文字 |

### 语义色

| 令牌 | 用途 |
|------|------|
| `--color-success` | 成功/已通过/已售出 |
| `--color-warning` | 警告/审核中/待处理 |
| `--color-danger` | 错误/违规/已拒绝 |
| `--color-info` | 信息/提示/帮助 |
| `--color-love` | 恋爱区专用 |

### 主题方案

支持 7 种主题：靛蓝、海洋蓝、翡翠绿、暖橙、玫红、紫罗兰、暗夜紫。通过 ThemePicker 切换，自动写入 localStorage。

---

## 🔤 排版系统

### 字号层级（Major Third 1.25）

| 级别 | 大小 | 用途 |
|------|------|------|
| `h1 / .h1` | `--text-dynamic-4xl` (36px) | 页面主标题 |
| `h2 / .h2` | `--text-dynamic-3xl` (30px) | 区块标题 |
| `h3 / .h3` | `--text-dynamic-2xl` (24px) | 卡片标题 |
| `h4 / .h4` | `--text-dynamic-xl` (20px) | 子标题 |
| `body` | `--text-dynamic-base` (16px) | 正文 |
| `caption` | `--text-sm` (14px) | 辅助文字 |

### 字体栈

```css
--font-sans: 'Inter', system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

---

## 📏 间距系统

基于 8px 网格：`4→8→12→16→20→24→32→40→48→64→80→96→128`

| 使用场景 | 间距值 |
|----------|--------|
| 元素内边距 | `--space-2` (8px) ~ `--space-4` (16px) |
| 卡片间距 | `--space-4` (16px) ~ `--space-6` (24px) |
| 区块间距 | `--space-8` (32px) ~ `--space-16` (64px) |
| 页面边距 | `--space-4` (移动端) → `--space-8` (桌面端) |

---

## 🧱 组件架构

### CSS 文件结构

```
styles/
├── globals.css         # 主入口（导入所有模块）
├── colors.css          # 品牌色彩与使用指南
├── typography.css      # 排版层级与文本工具类
├── spacing.css         # 间距与布局系统
├── animation.css       # 动效预设（20种关键帧）
├── components.css      # 基础组件样式（按钮/卡片/徽章/头像/骨架屏）
├── forms.css           # 表单元素样式
└── accessibility.css   # 无障碍增强
```

### React 组件

```
components/
├── ui/                 # 设计系统组件
│   ├── Button.tsx      # 按钮（5 variants × 3 sizes）
│   ├── Card.tsx        # 卡片（4 variants）
│   ├── Modal.tsx       # 弹窗 + ConfirmDialog
│   └── index.ts
├── common/             # 通用组件
│   ├── EmptyState.tsx  # 空状态（3 variants）
│   ├── Skeleton.tsx    # 骨架屏（10 variants）
│   ├── Breadcrumb.tsx  # 面包屑导航
│   ├── PageTransition.tsx
│   ├── UserAvatar.tsx
│   └── ...
├── layout/             # 布局组件
│   ├── AppLayout.tsx   # 主布局
│   ├── SideNav.tsx     # 侧边栏（可折叠+分组）
│   ├── Header.tsx      # 页面头部
│   └── AdminLayout.tsx
└── theme/
    └── ThemePicker.tsx # 7色主题选择器
```

---

## 🎬 动效系统

### 20种关键帧动画

| 动画 | 用途 |
|------|------|
| `fadeIn/fadeInUp` | 页面元素入场 |
| `scaleIn/scaleInUp` | 弹窗/卡片出现 |
| `bounceIn` | 重要元素弹出 |
| `slideUp/slideDown` | 面板滑入滑出 |
| `shimmer` | 骨架屏加载 |
| `heartbeat` | 点赞/收藏反馈 |
| `shake` | 表单验证错误 |
| `pulse-ring` | 通知提醒 |
| `float` | 浮动装饰 |
| `spin-soft` | 加载旋转 |
| `marquee` | 公告跑马灯 |
| `glowPulse` | 光晕呼吸 |

### 过渡预设

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);    /* 平滑结束 */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* 弹性回弹 */
```

---

## ♿ 无障碍标准

| 标准 | 实现 |
|------|------|
| WCAG AA 颜色对比度 | 4.5:1（正文）/ 3:1（大文字）✅ |
| 键盘导航 | 全功能键盘可达 ✅ |
| 焦点可见 | `:focus-visible` 2px outline ✅ |
| 屏幕阅读器 | 语义化 HTML + ARIA 标签 ✅ |
| 跳过导航 | `.skip-link` 组件 ✅ |
| 触摸目标 | 最小 44px（WCAG 2.5.5）✅ |
| 减少动画 | `prefers-reduced-motion` 尊重 ✅ |
| 高对比度 | `forced-colors: active` 适配 ✅ |

---

## 📱 响应式断点

| 断点 | 范围 | 布局 |
|------|------|------|
| 移动端 | 320px - 639px | 底部导航 + 水平滚动 |
| 平板 | 640px - 1023px | 侧边栏 + 2列网格 |
| 桌面 | 1024px - 1279px | 侧边栏 + 4列网格 |
| 大屏 | 1280px+ | 侧边栏 + 5列网格 |

---

## 🎯 设计决策记录

1. **为什么用 Indigo 作为品牌色？** — 源于郑州轻工业大学校徽蓝紫色，象征智慧与信任
2. **为什么是 8px 间距系统？** — 与主流设计系统（Material/Apple）对齐，便于开发协作
3. **为什么 CSS 变量而非 Tailwind 主题？** — CSS 变量运行时零开销，可被 JS 动态修改，主题切换无需重编译
4. **为什么 Mobile 底部导航只有5项？** — 遵循移动端认知负荷原则，核心功能直达

---

## 📊 文件统计

| 文件 | 行数 | 用途 |
|------|------|------|
| `globals.css` | ~1400 | 主样式入口 + 全局重置 |
| `colors.css` | ~300 | 品牌色彩系统 |
| `typography.css` | ~400 | 排版层级 |
| `spacing.css` | ~200 | 布局工具类 |
| `animation.css` | ~200 | 动效预设 |
| `components.css` | ~200 | 基础组件 |
| `forms.css` | ~250 | 表单元素 |
| `accessibility.css` | ~150 | 无障碍 |
| **总计** | **~3100** | |

---

**UI Designer**: UI Designer Agent  
**设计系统版本**: v4.0  
**最后更新**: 2026-06-12
