# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

轻淘 (QingTao) is a campus platform for 郑州轻工业大学 — a full-stack TypeScript app with a React 19 frontend, Express 4 backend, and SQLite database. Core features: second-hand marketplace, community posts, lost & found, anonymous dating space, campus Q&A, private messaging, treehole, and course resources. Dual-layer content moderation (300+ word blocklist + DeepSeek AI async review).

## Development Commands

### Backend (`qingtao-server/`)

```bash
cd qingtao-server
npm run dev                # Start with hot reload (tsx watch), runs on :3000
npx prisma db push         # Sync schema to SQLite (no migrations)
npx tsx prisma/seed.ts     # Seed test data (admin/123456, zhangsan~chenchen/123456)
npx prisma studio           # Open Prisma DB GUI
npm run build && npm start  # Production build & run
```

### Frontend (`qing-tao-campus/`)

```bash
cd qing-tao-campus
npm run dev        # Vite dev server on :5175, proxies /api→:3000
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm test           # Vitest (jsdom)
npm run test:watch # Vitest watch mode
```

## Architecture

### Backend (Express 4 + Prisma 5 + SQLite)

The backend follows a layered pattern:

- **`routes/`** — Router files that wire HTTP methods to controllers. One file per domain (`goods.routes.ts`, `dating.routes.ts`, etc.). The main router in `routes/index.ts` mounts all sub-routers under `/api`.
- **`controllers/`** — Request handlers. Controllers call Prisma directly (no repository layer). Response format is always `{ code, message, data }`.
- **`middleware/`** — `auth.ts` (JWT with tokenVersion for invalidation), `moderation.middleware.ts` (word blocklist sync + AI async), `upload.ts` (Multer + Sharp → WebP + 50px blur), `rateLimiter.ts`, `errorHandler.ts`, `validate.ts`.
- **`services/`** — `moderation.service.ts` (DeepSeek API call with role-locked 0/1 output), `notification.service.ts` (create notifications), `upload.service.ts`, `auth.service.ts`.
- **`config/`** — `env.ts` (validated env vars), `database.ts` (Prisma client singleton), `jwt.ts` (secret + expiry config).

**Auth flow**: JWT with short-lived access tokens (15min) + long refresh tokens (7d). `tokenVersion` on the User model invalidates all tokens when password changes. A global middleware in `app.ts` rejects disabled users on every request. `optionalAuth` middleware attaches user if token present, but doesn't block.

**Content moderation flow**: 
1. L1: 300+ word blocklist checked synchronously in `moderateBody()` middleware — blocks invalid content at request time with 400.
2. L2: `afterCreate()` fires async DeepSeek AI review. If flagged → content status set to `offline`, author notified. If safe → status becomes `approved`. Crash recovery via `recoveryScan()` on startup.
3. Images: auto-blurred on upload (50px Gaussian), displayed blurred until admin approves.

**Key middleware order in `app.ts`**: helmet → compression → CORS → body parsing → disabled user block → rate limiter → enumeration guard → static files → routes → 404 → error handler.

### Frontend (React 19 + Vite 8 + Tailwind CSS 4)

- **Routing**: React Router 7 with lazy-loaded pages. Two layout wrappers: `AppLayout` (main app with sidebar nav) and `AdminLayout`. `ProtectedRoute` redirects to `/login`, `AdminRoute` checks `role === 'admin'`.
- **State**: Zustand stores — `authStore` (user + token, initializes from localStorage on creation), `uiStore`, `searchStore`, `unreadStore`.
- **API**: `utils/api.ts` — `apiFetch()` wraps `fetch` with auto Bearer token, 401→refresh→retry flow, 403 ban detection, 429 toast, GET 500 auto-retry. Backend URL is `/api` proxied by Vite.
- **Styles**: Tailwind CSS 4 with a custom design system in `globals.css` (9 keyframe animations, glass morphism, skeleton shimmer, utility classes).
- **Components**: `common/` (Skeleton, EmptyState, ImageUploader, UserAvatar, MathCaptcha, ModerationBadge), `layout/` (AppLayout, AdminLayout, Header, SideNav).

### Database (SQLite WAL mode, 31 models)

Key patterns:
- Content statuses: `pending` → `approved` / `offline` (by AI or admin)
- `isDeleted` soft-delete on Goods, Post, LostFound (never hard-delete user content)
- Images stored as JSON arrays in text columns (`"["url1","url2"]"`)
- Dating section has its own profile/message/follow/request models separate from main User
- `tokenVersion` on User is incremented on password change to invalidate all JWTs
- `violationCount` + `violationBanUntil` on User for progressive discipline

## Key Conventions

- Backend responses: always `{ code: number, message: string, data: any }`. Code 200=success, 201=created, 400=bad request/blocked content, 401=unauthorized, 403=forbidden/disabled, 404=not found, 429=rate limited.
- Controller protection: multiple controllers contain `isNaN` guard patterns on all `parseInt()` calls (hardened in v1.0.23–v1.0.29).
- IDs are autoincrement integers (not UUIDs).
- Multi-field `@@unique` constraints are used extensively (follows, favorites, cart, blocks, votes).
- Chat/ Dating messages are deleted after 24h (scheduled cleanup in `index.ts`).
- Uploaded images get a `blurredUrl` variant (50px + Gaussian blur) stored in `ImageReview` for admin approval.
