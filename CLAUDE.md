# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TestManager** adalah aplikasi internal untuk manajemen **Test Plan** dan **Test Case** suatu project. Dibangun sebagai eksperimen arsitektur: **React 19 + TypeScript (Vite, SPA murni)** + **PrimeReact** (UI library, setara PrimeVue) + **Supabase** (Postgres BaaS) sebagai storage, saat ini tanpa backend custom (backend custom sedang dieksplorasi, lihat folder `backend/`).

Tujuan utama repo ini adalah memvalidasi pola **clean architecture di sisi frontend** (Repository → Service → Hook → Component) yang bisa dipakai ulang di project React lain, bukan untuk fitur test management yang lengkap secara production-grade.

### Struktur repo

```
frontend/     → Aplikasi React + Vite (SPA) — lihat detail layering di bawah
backend/      → (eksperimental) backend custom, terpisah dari frontend
supabase/     → Schema SQL shared, dipakai frontend (dan nanti backend)
docs/         → PRD, arsitektur, task breakdown
```

---

## Commands

### Development

Semua command frontend dijalankan dari dalam folder `frontend/`:

```bash
cd frontend
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run preview   # Preview hasil build
npm run lint      # ESLint
```

### Database (Supabase)

Tidak ada migration runner otomatis. Schema dikelola manual via file SQL:

```bash
# Jalankan isi supabase/schema.sql di Supabase SQL Editor (project dashboard)
# Jalankan supabase/seed.sql (opsional) untuk data contoh
```

Environment variable di `frontend/.env` (lihat `frontend/.env.example`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Architecture

Aplikasi ini **SPA murni tanpa backend custom** — tidak ada API routes, tidak ada SSR. Semua akses data langsung dari browser ke Supabase (Postgres + auto REST) via `@supabase/supabase-js`.

### Layered structure (`frontend/src/`)

```
config/          → supabaseClient.ts (satu-satunya tempat inisialisasi Supabase client)
repositories/     → Query mentah ke Supabase + mapping row (snake_case) → domain type (camelCase)
                    TIDAK boleh berisi business rule/validasi
services/        → Business logic, validasi, orkestrasi lintas repository
                    Halaman/komponen HARUS lewat service, TIDAK LANGSUNG memanggil repository
helpers/          → Fungsi murni tanpa side effect: mappers.ts (row↔domain), dateFormatter.ts, dll
hooks/            → Composables ala React: jembatani lifecycle React + service layer
                    (fetch on mount, loading/error state, reload function)
types/domain.ts   → Semua domain model (Project, TestPlan, TestCase, TestPlanCase)
components/       → UI reusable (layout/, ui/) — tidak memanggil service langsung, terima props/callback
pages/            → Route-level components, orkestrasi hooks + components untuk satu halaman
```

**Alur data:** `Component/Page → Hook → Service → Repository → Supabase`

Jangan pernah skip layer (mis. Page memanggil Repository langsung, atau Component memanggil Supabase langsung).

### Konvensi Judul Halaman

Setiap halaman **list** WAJIB memakai `<PageHeader title="..." actions={...} />` dari `frontend/src/components/ui/PageHeader.tsx` untuk judul + tombol aksi utama — JANGAN menulis manual `<div className="flex ..."><h2>...`. Ini pernah tidak konsisten (sebagian pakai `<h2 className="m-0">` dibungkus flex, sebagian `<h2>` polos) dan sudah dirapikan; jangan regresi ke pola lama.

Halaman **detail** (judul = nama entity, di dalam `Card`) tidak pakai `PageHeader` — ikuti pola `ProjectDetailPage`/`UserDetailPage`: `<h2 className="m-0">` di dalam wrapper flex sendiri di header Card.

### Kenapa tidak ada Controller/API layer?

Ini bukan server-driven app (beda dengan pola Laravel+Inertia di [amanah-pos](../amanah-pos)). Karena storage-nya BaaS (Supabase) dan aplikasi ini SPA murni, "controller" digantikan oleh kombinasi Hook (React lifecycle) + Service (business logic) — tidak perlu Next.js API routes atau SSR karena tidak ada kebutuhan SEO/first-paint server-side untuk aplikasi internal seperti ini.

### Domain Model — Test Management Workflow

Model ini memisahkan **template pengujian** dari **riwayat eksekusi**, supaya re-run tidak menimpa hasil lama:

```
Project
  ├─ Module           (master per project, satu Test Case = satu Module)
  ├─ Tag              (label bebas, many-to-many ke Test Case, beda fungsi dari Module)
  ├─ Test Case        (template: title, objective, precondition, steps, expected result,
  │                     priority, status active/archived — TIDAK PERNAH menyimpan hasil)
  └─ Test Plan        (cakupan: test case mana saja yang relevan untuk suatu rilis/siklus)
       └─ Test Run    (satu sesi eksekusi, mis. "Regression Test 2026-07-25")
            └─ Test Result   (satu baris per Test Case yang dites di run ini: PASS/FAIL/SKIP/BLOCKED,
                               tester, executed_at, notes — DI SINI-lah hasil hidup)
                 └─ Issue    (0..N per Test Result yang FAIL — 1:many, sesuai keputusan produk)
```

**Aturan yang tidak boleh dilanggar:**
- `test_cases` dan `test_plan_cases` TIDAK PERNAH punya kolom hasil (pass/fail/dll) — itu selalu di `test_results`
- Setiap kali test plan dites ulang → **Test Run baru** dibuat, bukan menimpa run sebelumnya
- **Test Run "Completed" selalu manual** (tombol) — tapi **summary/progress selalu dihitung otomatis** on-the-fly dari `test_results` (`testRunService.getWithResults`), tidak pernah disimpan sebagai kolom
- Issue 1:many terhadap Test Result
- Tester HARUS user terdaftar (`users`, ditampilkan lewat `profiles`), bukan teks bebas

| Entity | Deskripsi |
|---|---|
| `Project` | Container utama — status `active`\|`inactive`\|`archived` |
| `Module` | Master per project — satu per Test Case |
| `Tag` | Label bebas per project, many-to-many ke Test Case |
| `TestCase` | Template pengujian — title, objective, preconditions, steps, expectedResult, priority, status (`active`\|`archived`), notes |
| `TestPlan` | Cakupan test case untuk suatu rilis/siklus |
| `TestPlanCase` | Junction — HANYA "test case mana masuk plan ini", tanpa kolom hasil |
| `TestRun` | Satu sesi eksekusi — `status`: `in_progress`\|`completed` (manual) |
| `TestResult` | Satu baris per (TestRun × TestCase) — `status`, `testerId`, `executedAt`, `notes` |
| `Issue` | 0..N per TestResult FAIL — title, description, actualResult, expectedResult, priority, status, assignedTo |
| `User` | 1:1 dengan `auth.users` Supabase — privat: `email`, `role` (`user`\|`admin`, platform-ops flag) |
| `Profile` | 1:1 dengan `User` — publik: `username`, `displayName`, `avatarUrl`, `bio` (lihat `docs/ARCHITECTURE_V2.md` §1/§3) |

Lihat `frontend/src/types/domain.ts` untuk tipe lengkap, dan `supabase/schema*.sql` (dijalankan berurutan: `schema.sql` → `schema_auth.sql` → `schema_project_lifecycle.sql` → `schema_test_management_v2.sql`) untuk skema tabel.

### Auth & RBAC (Google Login)

**Sejak Platform Evolution V2 Phase 2** (lihat `docs/ARCHITECTURE_V2.md`, `docs/ROADMAP_V2.md`):
signup **self-serve**, tidak ada lagi gate approval admin.

- Login **hanya via Google OAuth** (Supabase Auth) — tidak ada email/password
- Setiap signup baru langsung dapat `role = 'user'` — tidak ada status `pending`, tidak butuh approval admin
- `role` (`user` | `admin`) adalah **platform-ops flag**, bukan gate akses — akses ke suatu project ditentukan oleh `project_members` (lihat §Domain Model), bukan oleh `role` global
- Identity di-split jadi dua tabel: `users` (privat — `email`, `role`, tidak pernah di-join ke tampilan publik) dan `profiles` (publik — `username`, `display_name`, `avatar_url`, `bio`). Selalu resolve nama/avatar tampilan lewat `profiles`, jangan lewat `users`
- Admin pertama **di-set manual** lewat Supabase Table Editor — tidak ada mekanisme otomatis (sengaja, lihat `docs/PRD.md`)
- State auth global ada di `AuthProvider` (`frontend/src/hooks/useAuth.tsx`), expose `user` (role) dan `profile` (identity) terpisah, dikonsumsi via `useAuthContext()` — jangan query `supabase.auth` langsung dari component
- Route guard: `components/auth/ProtectedRoute.tsx` (wajib login saja — tidak ada lagi cek approval), `components/auth/AdminRoute.tsx` (wajib admin, untuk layar admin-ops seperti User Management) — **ini hanya UX**, keamanan sebenarnya ada di RLS
- Modul User Management (`pages/users/UserManagementPage.tsx`) baca `users` (email/role) lewat `userRepository` → `userService` → `useUsers` hook → page. Modul identity publik (Settings, `/@username`) baca `profiles` lewat `profileRepository` → `profileService` — dua jalur terpisah, jangan dicampur

### Naming & Convention

- Semua kode (variable, function, file, table, column) dalam Bahasa Inggris
- Label UI boleh Bahasa Indonesia
- Supabase columns: `snake_case`. Domain types: `camelCase`. Mapping selalu lewat `frontend/src/helpers/mappers.ts`
- Setiap modul baru (mis. "Test Suite") mengikuti pola yang sama persis dengan modul Test Plan: 1 repository + 1 service + 1-2 hooks + halaman di `pages/{module}/`

### UI Library — PrimeReact

- Versi stable **10.x** dipakai (BUKAN v11 — masih preview/alpha dengan API tema yang belum stabil saat repo ini dibuat)
- Tema: `lara-light-blue` via classic `primereact/resources/themes/*/theme.css` import di `main.tsx`
- Utility class layout (flex, spacing, dll): **PrimeFlex** (`primeflex/primeflex.css`)
- Icon: **PrimeIcons** (`pi pi-*`)
- Provider: `<PrimeReactProvider>` di `main.tsx` — bungkus seluruh app

### Module Creation Order (untuk fitur/modul baru)

1. Tambah tabel di `supabase/schema.sql` (+ update jika sudah pernah dijalankan: jalankan ulang manual di Supabase SQL Editor)
2. Domain type di `frontend/src/types/domain.ts`
3. Row mapper di `frontend/src/helpers/mappers.ts`
4. Repository di `frontend/src/repositories/{module}Repository.ts` — CRUD murni
5. Service di `frontend/src/services/{module}Service.ts` — business rules & validasi
6. Hook di `frontend/src/hooks/use{Module}.ts` — state + lifecycle
7. Halaman di `frontend/src/pages/{module}/`
8. Route di `frontend/src/App.tsx`
9. Menu item di `frontend/src/components/layout/AppLayout.tsx`

---

## Dokumentasi Tambahan

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements: scope, modul, target pengguna, out-of-scope. **Baca sebelum mendiskusikan fitur baru.**
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arsitektur teknis detail: layering, data flow, skema database, keputusan desain. **Baca sebelum membuat modul baru atau menyentuh layer service/repository.**
- [`docs/TASKS.md`](docs/TASKS.md) — Work breakdown (Epic → Feature → Task) dengan status.
- [`FEATURES.md`](./FEATURES.md) — Checklist status fitur per modul.
- [`TODO.md`](./TODO.md) — Sprint board aktif. **Titik mulai sesi kerja.**

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
