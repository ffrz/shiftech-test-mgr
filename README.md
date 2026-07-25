# TestManager (shiftech-test-mgr)

Aplikasi internal sederhana untuk manajemen **Test Plan** dan **Test Case**
suatu project.

## Stack

- **React 19 + TypeScript** (Vite, SPA murni tanpa SSR)
- **PrimeReact v10** — UI library rich/lengkap setara PrimeVue, fully open
  source
- **Supabase** — Postgres BaaS untuk storage + Auth (Google OAuth)
- **react-router-dom** — routing client-side
- Clean architecture: **Repository → Service → Hook → Component/Page**
- **Auth & RBAC**: login Google (self-serve signup), role `user`/`admin` sebagai
  platform-ops flag — akses per-project diatur lewat `project_members` (lihat
  `docs/ARCHITECTURE_V2.md`)

## Struktur Repo

```
landing/    → Landing page publik (HTML/CSS statis, di-serve di path "/")
frontend/   → Aplikasi React + Vite (SPA, di-serve di path "/app" — lihat vite.config.ts base + main.tsx basename)
backend/    → (eksperimental, di-pending — lihat backend/README.md) backend custom, terpisah dari frontend
supabase/   → Schema SQL shared
docs/       → PRD, arsitektur, task breakdown
```

Production di-deploy di belakang reverse-proxy: `/` → `landing/index.html` (statis),
`/app/*` → hasil build `frontend/` (lihat `deploy/deploy-vps.sh`). Semua link "Sign In"/
"Get Started" di landing page mengarah ke `/app/login`, bukan `/login`.

## Getting Started

```bash
cd frontend
npm install
cp .env.example .env   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY dari dashboard Supabase
npm run dev
```

Vite dev server sudah dikonfigurasi dengan base path `/app` (`vite.config.ts` +
`main.tsx`'s `basename="/app"`, sama seperti production) — akses aplikasi di
`http://localhost:5173/app`, bukan `http://localhost:5173/`. Root `/` tidak dikenal
oleh dev server React (di luar `basename` router) — itu wilayah `landing/`.

Untuk melihat landing page secara lokal, serve `landing/` sebagai static file
terpisah (tidak lewat Vite):

```bash
npx serve landing   # atau: cd landing && python -m http.server 8000
```

Jalankan `supabase/schema.sql` lalu `supabase/schema_auth.sql` (urutan penting)
di Supabase SQL Editor untuk membuat tabel + RBAC (dan `supabase/seed.sql` untuk
data contoh).

Untuk mengaktifkan login Google dan menetapkan admin pertama, lihat bagian
"Setup Google OAuth" di [`AGENTS.md`](./AGENTS.md).

## Scripts

Dijalankan dari dalam folder `frontend/`:

| Command           | Deskripsi                     |
| ----------------- | ----------------------------- |
| `npm run dev`     | Dev server                    |
| `npm run build`   | Type-check + build production |
| `npm run preview` | Preview hasil build           |
| `npm run lint`    | ESLint                        |

## Dokumentasi

- [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) — panduan untuk AI
  coding agent
- [`docs/PRD.md`](docs/PRD.md) — kebutuhan produk
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arsitektur teknis
- [`docs/TASKS.md`](docs/TASKS.md) — breakdown pekerjaan
- [`FEATURES.md`](./FEATURES.md) — status fitur
- [`TODO.md`](./TODO.md) — sprint board aktif
