# Testify (shiftech-test-mgr)

Aplikasi (sedang bertransisi dari internal tool menjadi produk self-serve)
untuk manajemen **Test Plan** dan **Test Case** suatu project — nama produk
**Testify**, nama repo tetap `shiftech-test-mgr`. Lihat
[`docs/PRODUCT_CONSTITUTION.md`](docs/PRODUCT_CONSTITUTION.md) untuk visi
produk dan [`docs/ARCHITECTURE_V2.md`](docs/ARCHITECTURE_V2.md) untuk
redesign platform (identity split, self-serve signup, project
ownership/visibility, invite/accept membership) yang sedang berjalan.

## Stack

- **React 19 + TypeScript** (Vite, SPA murni tanpa SSR)
- **PrimeReact v10** — UI library rich/lengkap setara PrimeVue, fully open
  source
- **Supabase** — Postgres BaaS untuk storage + Auth (Google OAuth)
- **react-router-dom** — routing client-side
- Clean architecture: **Repository → Service → Hook → Component/Page**
- **Auth & RBAC**: login Google (self-serve signup, tidak ada lagi gate
  approval admin), role `user`/`admin` sebagai platform-ops flag — akses
  per-project diatur lewat `project_members` dengan status
  `invited`/`accepted`/`declined` (lihat `docs/ARCHITECTURE_V2.md`)

## Struktur Repo

```
landing/      → Landing page publik (HTML/CSS statis, di-serve di path "/")
frontend/     → Aplikasi React + Vite (SPA, di-serve di path "/app" — lihat vite.config.ts base + main.tsx basename)
public-docs/  → Docs site publik (Astro Starlight, di-serve di path "/docs" — user guide + data model)
backend/      → Backend Go platform: MCP server (aktif) + REST API (rencana).
                 Lihat backend/ARCHITECTURE.md untuk detail arsitektur.
supabase/     → Schema SQL shared (dikelola via Supabase CLI, lihat supabase/migrations/)
docs/         → PRD, arsitektur (v1 + v2 redesign), roadmap, product constitution, task breakdown
```

Production di-deploy di belakang reverse-proxy lewat satu release directory
(rsync + symlink swap atomik, lihat `deploy/deploy-vps.sh`):
`/` → `landing/index.html` (statis), `/app/*` → hasil build `frontend/`,
`/docs/*` → hasil build `public-docs/` (Astro). Backend Go tidak ikut deploy
(masih di-pending). Semua link "Sign In"/"Get Started" di landing page
mengarah ke `/app/login`, bukan `/login`.

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
- [`docs/PRODUCT_CONSTITUTION.md`](docs/PRODUCT_CONSTITUTION.md) — visi
  produk, scope MVP, aturan penerimaan fitur (dokumen tertinggi — kalau
  konflik dengan dokumen lain, dokumen ini menang)
- [`docs/PRD.md`](docs/PRD.md) — kebutuhan produk (Testing Domain, v1)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arsitektur teknis
  (Testing Domain: layering, schema, RLS)
- [`docs/ARCHITECTURE_V2.md`](docs/ARCHITECTURE_V2.md) — redesign Platform
  Context (identity split, ownership, visibility, membership)
- [`docs/ROADMAP_V2.md`](docs/ROADMAP_V2.md) — fase eksekusi redesign V2
- [`docs/TASKS.md`](docs/TASKS.md) — breakdown pekerjaan (v1 epics)
- [`FEATURES.md`](./FEATURES.md) — status fitur
- [`TODO.md`](./TODO.md) — sprint board aktif
