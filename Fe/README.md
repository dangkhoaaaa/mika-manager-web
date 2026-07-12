# Progress Challenge

Ứng dụng web premium giúp người dùng cam kết mục tiêu học tập dài hạn, ghi nhận tiến độ hàng ngày, upload bằng chứng và chia sẻ hành trình.

## Tech Stack

- Next.js 15 (App Router) + React 19
- TypeScript, TailwindCSS, Framer Motion
- @dnd-kit, React Hook Form, Zod, TanStack Query, Zustand
- Recharts, shadcn/ui components

## Cài đặt

```bash
cd Fe
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend chạy tại `http://localhost:3000`

## Backend

API backend nằm tại `../backend` (Go + Chi + MongoDB).

```bash
cd ../backend
cp .env.example .env
go run ./cmd/api
```

API chạy tại `http://localhost:8080`

## Cấu trúc thư mục

```
Fe/
├── src/
│   ├── app/
│   │   ├── (app)/          # Protected routes (dashboard, goals, ...)
│   │   ├── (auth)/         # Login, register, forgot password
│   │   └── u/[username]/   # Public profile
│   ├── components/
│   │   ├── ui/             # shadcn-style primitives
│   │   ├── layout/         # Sidebar, TopBar
│   │   └── shared/         # Heatmap, charts, animations
│   └── lib/
│       ├── api.ts          # REST client
│       ├── types.ts        # TypeScript types
│       └── store.ts        # Zustand stores
```

## API Endpoints (Progress Challenge)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/pc/dashboard` | Dashboard stats |
| GET/POST | `/api/pc/goals` | CRUD goals |
| POST | `/api/pc/goals/{id}/logs` | Daily log |
| GET | `/api/pc/statistics` | Charts & analytics |
| GET | `/api/pc/achievements` | Badges |
| GET | `/api/pc/profile/{username}` | Public profile |
| POST | `/api/pc/upload` | Cloudinary upload |

## Tính năng

- Dashboard với heatmap, streak, stats
- Goals với drag & drop reorder
- Daily logs với mood, difficulty, evidence
- Gallery masonry layout
- Achievements tự động unlock
- Public profiles
- Search goals & users (⌘K)
- Dark mode first, glassmorphism UI
