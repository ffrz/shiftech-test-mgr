# shiftech-test-mgr (TestManager) — OpenCode Project Rules

Aplikasi internal manajemen Test Plan & Test Case. Eksperimen arsitektur clean
layering di React SPA. Owner: Fahmi Fauzi Rahman.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite (SPA murni, tanpa SSR)
- **UI Library**: PrimeReact v10 (stable) + PrimeFlex (utility CSS) + PrimeIcons
- **Storage/Backend**: Supabase (Postgres, BaaS) via `@supabase/supabase-js` —
  tidak ada backend custom
- **Routing**: react-router-dom
- **Data fetching cache**: @tanstack/react-query (tersedia, dipakai bertahap)
- **Form & validation**: react-hook-form + zod (tersedia, dipakai bertahap)
- **Testing**: belum ada — tambahkan Vitest + Testing Library jika diperlukan

## Directory Structure

```
frontend/                     # Aplikasi React + Vite (SPA) — package.json ada DI SINI, jalankan npm dari sini
  src/
    config/
      supabaseClient.ts       # Satu-satunya inisialisasi Supabase client
    types/
      domain.ts               # Domain model — lihat Domain Model (Test Management Workflow) di bawah
    helpers/
      mappers.ts               # Row (snake_case) <-> Domain (camelCase) mapping
      dateFormatter.ts
    repositories/
      projectRepository.ts     # Query mentah Supabase, TANPA business rule — SATU-SATUNYA layer yang tahu Supabase
      moduleRepository.ts
      tagRepository.ts
      testPlanRepository.ts
      testCaseRepository.ts
      testRunRepository.ts
      testResultRepository.ts
      issueRepository.ts
      profileRepository.ts
    services/
      projectService.ts        # Business logic, validasi, orkestrasi repository
      moduleService.ts
      tagService.ts             # Creatable tag resolution (findOrCreate + set junction)
      testPlanService.ts
      testCaseService.ts
      testRunService.ts         # start() seeds test_results; getWithResults() computes summary on the fly
      issueService.ts
      profileService.ts
    hooks/
      useTestPlans.ts           # Jembatan React lifecycle <-> service
      useTestPlanDetail.ts       # Cases in scope for a plan — no result/progress here
      useTestRuns.ts / useTestRunDetail.ts
      useModules.ts / useIssues.ts / useProfiles.ts
      useAuth.tsx                # AuthProvider + useAuthContext() — session, profile, role, signIn/signOut
      useTheme.tsx                # ThemeProvider — system/light/dark
    components/
      layout/                   # AppLayout, AppTopbar, AppSidebar, AppMenu, LayoutContext, ThemeToggle
      auth/ProtectedRoute.tsx    # Guard: wajib login + role approved
      auth/AdminRoute.tsx        # Guard: wajib role admin
      ui/PageHeader.tsx           # WAJIB dipakai di semua halaman list (lihat Coding Conventions)
    pages/
      projects/ProjectsPage.tsx, ProjectDetailPage.tsx   # Detail: tab Test Plans/Test Cases/Modules
      test-plans/TestPlansPage.tsx, TestPlanDetailPage.tsx # Detail: tab Test Cases/Test Runs
      test-cases/TestCasesPage.tsx
      test-runs/TestRunDetailPage.tsx, TestRunIssuesPage.tsx
      auth/LoginPage.tsx, PendingApprovalPage.tsx
      users/UserManagementPage.tsx, UserDetailPage.tsx
    App.tsx                     # Route definitions (public: /login, /pending-approval; protected: rest)
    main.tsx                    # Providers: ThemeProvider, PrimeReactProvider, QueryClientProvider, BrowserRouter, AuthProvider
backend/                       # (disiapkan untuk migrasi masa depan) backend PHP + SQLite, saat ini kosong
supabase/                      # Schema SQL — jalankan berurutan, masing-masing bergantung pada file sebelumnya
  schema.sql                   # DDL awal: projects, test_plans, test_cases, test_plan_cases
  schema_auth.sql              # profiles + trigger auto-provision + RLS berbasis role
  schema_project_lifecycle.sql # projects.status, profiles.deleted_at
  schema_test_management_v2.sql # modules, tags, test_case_tags, test_runs, test_results, issues; reshape test_cases/test_plan_cases
docs/                          # PRD, ARCHITECTURE, TASKS
```

## Domain Model — Test Management Workflow

```
Project
  ├─ Module           (master per project, satu Test Case = satu Module)
  ├─ Tag              (label bebas, many-to-many ke Test Case)
  ├─ Test Case        (template — TIDAK PERNAH menyimpan hasil pass/fail)
  └─ Test Plan        (cakupan test case untuk suatu rilis/siklus)
       └─ Test Run    (satu sesi eksekusi — status in_progress/completed, MANUAL)
            └─ Test Result   (satu baris per Test Case di run ini — DI SINI hasil hidup)
                 └─ Issue    (0..N per Test Result FAIL)
```

Aturan yang tidak boleh dilanggar saat menambah/mengubah kode di modul ini:

- `test_cases`/`test_plan_cases` tidak pernah punya kolom hasil — selalu
  tambahkan ke `test_results`
- Re-run = Test Run baru, bukan update Test Run lama
- Status Test Run "completed" HANYA berubah lewat aksi manual user
  (`testRunService.complete()`), TIDAK PERNAH inferred otomatis dari semua
  result terisi
- Summary/progress (jumlah pass/fail/dst) SELALU dihitung on-the-fly
  (`testRunService.getWithResults`), JANGAN buat kolom cache untuk itu
- Issue selalu 1:many terhadap Test Result
- `test_results.tester_id` selalu FK ke `profiles`, jangan ganti jadi teks bebas

## Important Commands

Dijalankan dari dalam folder `frontend/`:

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Vite dev server                    |
| `npm run build`   | Type-check (`tsc -b`) + Vite build |
| `npm run preview` | Preview production build           |
| `npm run lint`    | ESLint                             |

Database: tidak ada CLI migration. Jalankan berurutan di Supabase SQL Editor:
`supabase/schema.sql` → `supabase/schema_auth.sql` →
`supabase/schema_project_lifecycle.sql` (urutan penting — masing-masing
bergantung pada fungsi/tabel dari file sebelumnya).

**Setup Google OAuth (wajib, aksi manual di luar kode):**

1. Google Cloud Console → buat OAuth 2.0 Client ID (Web application), tambahkan
   redirect URI dari Supabase (`https://<project>.supabase.co/auth/v1/callback`)
2. Supabase Dashboard → Authentication → Providers → Google → isi Client ID &
   Secret
3. Supabase Dashboard → Authentication → URL Configuration → pastikan Site URL &
   Redirect URLs mencakup origin app (`http://localhost:5173` untuk dev)
4. Setelah login pertama kali, admin pertama di-set manual:
   `update profiles set role = 'admin' where email = '...'` di SQL Editor

## Coding Conventions

### Naming

- Bahasa Inggris untuk semua kode: variable, function, class, file, tabel, kolom
- Label UI ke pengguna boleh Bahasa Indonesia
- File: PascalCase untuk komponen (`.tsx`), camelCase untuk
  service/repository/hook (`.ts`)
- Hook selalu prefix `use` (React Rules of Hooks)

### Judul Halaman (`PageHeader`)

Semua halaman list pakai `<PageHeader title="..." actions={<Button .../>} />`
(`components/ui/PageHeader.tsx`) untuk baris judul + tombol aksi utama — jangan
tulis ulang
`<div className="flex justify-content-between align-items-center mb-3"><h2 className="m-0">...`
secara manual. Ini sempat tidak seragam antar halaman (beda margin/wrapper) dan
sudah dirapikan ke satu komponen; pertahankan itu saat menambah halaman baru.
Halaman detail (judul = nama entity di dalam `Card`) tetap pola manual seperti
`ProjectDetailPage`/`UserDetailPage`, bukan lewat `PageHeader`.

### Architecture Pattern (WAJIB diikuti, urutan layer tidak boleh dilompati)

```
Page/Component → Hook → Service → Repository → Supabase
```

- **Repository**: hanya query Supabase + panggil mapper. Tidak ada `if`/validasi
  bisnis.
- **Service**: validasi input, business rule, orkestrasi lintas repository (mis.
  hitung summary progress). Dipanggil oleh hook atau langsung oleh page untuk
  aksi one-off (create/update).
- **Hook**: state (`useState`) + lifecycle (`useEffect`) + expose `reload()`.
  Tidak ada logic bisnis di sini, hanya plumbing React.
- **Component/Page**: render + panggil hook/service. Tidak pernah import
  `supabase` client atau repository langsung.

### Data Mapping

- Supabase table & column: `snake_case` (mis. `project_id`, `expected_result`)
- Domain type (`frontend/src/types/domain.ts`): `camelCase` (mis. `projectId`,
  `expectedResult`)
- Konversi HANYA di `frontend/src/helpers/mappers.ts` — jangan mapping manual
  berulang di repository lain

### PrimeReact Usage

- Import tema di `main.tsx` saja:
  `primereact/resources/themes/lara-light-blue/theme.css`
- Gunakan PrimeFlex class (`flex`, `gap-2`, `align-items-center`, dll) untuk
  layout, bukan custom CSS baru
- Komponen data-heavy: `DataTable` + `Column` (server-side atau client-side
  paging sesuai kebutuhan)
- Notifikasi: pakai `Toast` (belum diinisialisasi — tambahkan `useRef<Toast>` +
  `<Toast ref>` di layout saat dibutuhkan)

### Module Creation Order (fitur/modul baru)

1. Tabel di file `supabase/schema_*.sql` BARU (jangan edit file yang sudah ada —
   buat file bernomor urut berikutnya)
2. Domain type (`types/domain.ts`)
3. Mapper (`helpers/mappers.ts`)
4. Repository (`repositories/{module}Repository.ts`)
5. Service (`services/{module}Service.ts`)
6. Hook (`hooks/use{Module}.ts`)
7. Page (`pages/{module}/`)
8. Route (`App.tsx`)
9. Menu item (`components/layout/AppMenu.tsx`) jika perlu entri sidebar baru

### Auth & RBAC

- Login: Google OAuth via Supabase Auth SAJA — jangan tambahkan provider lain
  kecuali diminta eksplisit
- Role: `pending` → `user` → `admin` (lihat `types/domain.ts` → `UserRole`)
- Selalu konsumsi state auth via `useAuthContext()` (`hooks/useAuth.tsx`) —
  JANGAN panggil `supabase.auth.*` langsung dari component/page
- Route baru yang butuh login: bungkus dengan `<ProtectedRoute>` di `App.tsx`.
  Route khusus admin: tambahkan lagi `<AdminRoute>` di dalamnya
- Kalau menambah field/aksi baru pada `profiles`, tetap lewat
  `profileRepository`/`profileService` — pola sama seperti modul lain
- RLS adalah lapisan keamanan yang sebenarnya — route guard di frontend cuma UX.
  Kalau menambah tabel baru, pastikan policy `is_approved()`/`is_admin()` (dari
  `schema_auth.sql`) diterapkan, jangan biarkan permissive

## Key Packages

| Package               | Usage                                                       |
| --------------------- | ----------------------------------------------------------- |
| primereact            | UI component library (setara PrimeVue)                      |
| primeflex             | Utility CSS (flex, spacing)                                 |
| primeicons            | Icon set                                                    |
| @supabase/supabase-js | Client Postgres BaaS                                        |
| react-router-dom      | Client-side routing                                         |
| @tanstack/react-query | Data fetching/cache (opsional, dipakai bertahap)            |
| react-hook-form + zod | Form state + schema validation (opsional, dipakai bertahap) |

## Internal Documentation

- `docs/PRD.md` — Product Requirements Document
- `docs/ARCHITECTURE.md` — Technical architecture detail
- `docs/TASKS.md` — Work breakdown (Epic → Feature → Task)
- `FEATURES.md` — Feature status checklist
- `TODO.md` — Active sprint board

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
