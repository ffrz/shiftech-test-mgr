# shiftech-test-mgr (Testify) — OpenCode Project Rules

Aplikasi manajemen Test Plan & Test Case, sedang bertransisi dari internal
tool ke produk self-serve bernama **Testify** (nama repo tetap
`shiftech-test-mgr`) — lihat `docs/PRODUCT_CONSTITUTION.md`. Eksperimen
arsitektur clean layering di React SPA. Owner: Fahmi Fauzi Rahman.

**Platform Evolution V2 sedang berjalan** (`docs/ARCHITECTURE_V2.md` +
`docs/ROADMAP_V2.md`): identity split (`profiles`→`users`+`profiles`),
self-serve signup (drop approval gate), project ownership + visibility,
membership invite/accept. Phase 1–6 done, Phase 7 (docs sync + walkthrough)
in progress. Testing Domain (Project→Module→TestCase→TestPlan→TestRun→
TestResult→Issue) tidak berubah oleh redesign ini.

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
landing/                       # Landing page publik (HTML/CSS statis, di-serve di path "/")
frontend/                      # Aplikasi React + Vite (SPA, di-serve di "/app") — package.json ada DI SINI, jalankan npm dari sini
  src/
    config/
      supabaseClient.ts        # Satu-satunya inisialisasi Supabase client
      app.ts                    # APP_NAME = 'Testify'
    types/
      domain.ts                # Domain model — lihat Domain Model (Test Management Workflow) di bawah
    helpers/
      mappers.ts                # Row (snake_case) <-> Domain (camelCase) mapping
      dateFormatter.ts
    repositories/
      projectRepository.ts      # Query mentah Supabase, TANPA business rule — SATU-SATUNYA layer yang tahu Supabase
      moduleRepository.ts, tagRepository.ts, testRoleRepository.ts
      testPlanRepository.ts, testCaseRepository.ts
      testRunRepository.ts, testResultRepository.ts, issueRepository.ts
      userRepository.ts          # email/role (privat) — admin user-management saja
      profileRepository.ts       # username/displayName/avatarUrl/bio (publik)
      projectMemberRepository.ts # invite/respond via security-definer RPC
      notificationRepository.ts
    services/
      projectService.ts         # Business logic, validasi, orkestrasi repository
      moduleService.ts, tagService.ts, testRoleService.ts
      testPlanService.ts, testCaseService.ts
      testRunService.ts          # start() seeds test_results; getWithResults() computes summary on the fly
      issueService.ts
      userService.ts             # admin ops: promote/demote/soft-delete
      profileService.ts          # identity publik: update, search, getByUsername
      projectMemberService.ts    # invite/accept/decline/reinvite/remove + fire notifications
      notificationService.ts
      projectDuplicateService.ts # clone struktur project (test plan/case/issue) TANPA riwayat run
    hooks/
      useTestPlans.ts            # Jembatan React lifecycle <-> service
      useTestPlanDetail.ts        # Cases in scope for a plan — no result/progress here
      useTestRuns.ts / useTestRunDetail.ts
      useModules.ts / useIssues.ts / useUsers.ts
      useAuth.tsx                 # AuthProvider + useAuthContext() — session, user (role), profile (identity)
      useProjectRole.ts           # capability checks per-project (canEditContent, canRunTests, dst)
      useProjectInvitations.ts    # pending invitations untuk current user (Home dashboard)
      useProjectAccessGuard.ts    # redirect ke "/" kalau role hilang saat user masih di halaman project
      useNotifications.ts         # list, unread count (polling 30s), mark read/remove
      useSettings.ts              # update profil sendiri (Settings page)
      useTheme.tsx                 # ThemeProvider — system/light/dark
    components/
      layout/                    # AppLayout, AppTopbar (bell notifikasi), AppMenu, LayoutContext, ThemeToggle
      auth/ProtectedRoute.tsx     # Guard: wajib login (tidak ada lagi cek pending/approval)
      auth/AdminRoute.tsx         # Guard: wajib role admin (hanya screen admin-ops)
      notifications/NotificationPanel.tsx # Sidebar slide-out kanan
      ui/PageHeader.tsx            # WAJIB dipakai di semua halaman list (lihat Coding Conventions)
      ui/UsernamePicker.tsx         # Debounced search untuk invite-by-username
      profile/ProfileView.tsx       # Reusable card identitas (avatar, nama, bio, daftar project/suite) — dipakai PublicProfilePage + UserDetailPage
    pages/
      projects/ProjectsPage.tsx, ProjectDetailPage.tsx, ProjectSettingsPage.tsx # Settings: tab Members (invite) + Danger Zone (visibility/archive/delete)
      test-plans/TestPlansPage.tsx, TestPlanDetailPage.tsx
      test-cases/TestCasesPage.tsx
      test-runs/TestRunResultDetailPage.tsx, TestRunIssuesPage.tsx
      test-suites/TestSuitesPage.tsx, TestSuiteDetailPage.tsx
      issues/IssueDetailPage.tsx
      auth/LoginPage.tsx           # PendingApprovalPage sudah DIHAPUS (V2 Phase 2, tidak ada lagi gate approval)
      users/UserManagementPage.tsx, UserDetailPage.tsx
      profiles/PublicProfilePage.tsx # /@:username — lihat profil publik user
      settings/SettingsPage.tsx    # Edit profil sendiri + theme toggle
      home/HomePage.tsx            # + card "Pending Invitations"
    App.tsx                       # Route definitions (public: /login; protected: rest; /@:username lookup)
    main.tsx                      # Providers: ThemeProvider, PrimeReactProvider, QueryClientProvider, BrowserRouter, AuthProvider
public-docs/                    # Docs site publik (Astro Starlight, di-serve di "/docs") — user guide + data model, konten asli
backend/                        # Shared-core Go platform: MCP server (aktif) + REST API (plan)
  ARCHITECTURE.md               # Otoritas arsitektur backend — baca ini dulu sebelum menyentuh kode di dalam backend/
backend_archive/                # Go backend lama (eksperimental, tidak dipakai)
supabase/
  migrations/                   # SOURCE OF TRUTH skema saat ini — dikelola via Supabase CLI (`supabase db push`)
  schema*.sql                   # Source historis awal, USANG sejak migrasi 20260722000001 — jangan jadikan acuan
docs/                            # PRODUCT_CONSTITUTION, PRD, ARCHITECTURE(+V2), ROADMAP_V2, TASKS
deploy/                          # deploy-vps.sh — rsync + atomic symlink swap ke satu release dir
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
- `test_cases.target_role` BUKAN lagi teks bebas — sudah jadi `target_role_id`
  FK ke `test_roles` (master per project, pola sama seperti Module)

## Important Commands

Dijalankan dari dalam folder `frontend/`:

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Vite dev server                    |
| `npm run build`   | Type-check (`tsc -b`) + Vite build |
| `npm run preview` | Preview production build           |
| `npm run lint`    | ESLint                             |

Database: dikelola via **Supabase CLI**, bukan SQL Editor manual. Migrasi baru
= tambah file `.sql` ke `supabase/migrations/` (nama `<timestamp>_<deskripsi>.sql`),
lalu `supabase db push --yes`. `supabase/schema*.sql` di root sudah usang
(source of truth pindah ke `supabase/migrations/` sejak migrasi
`20260722000001_auto_approve_signup.sql`).

**Setup Google OAuth (wajib, aksi manual di luar kode):**

1. Google Cloud Console → buat OAuth 2.0 Client ID (Web application), tambahkan
   redirect URI dari Supabase (`https://<project>.supabase.co/auth/v1/callback`)
2. Supabase Dashboard → Authentication → Providers → Google → isi Client ID &
   Secret
3. Supabase Dashboard → Authentication → URL Configuration → pastikan Site URL &
   Redirect URLs mencakup origin app (`http://localhost:5173/app` untuk dev)
4. Signup sekarang **self-serve** (tidak ada gate approval, V2 Phase 2) — admin
   pertama tetap di-set manual setelah login pertama kali:
   `update users set role = 'admin' where email = '...'` di SQL Editor (catatan:
   tabel identity privat sekarang bernama `users`, bukan lagi `profiles` — lihat
   Auth & RBAC di bawah)

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

Untuk modul **backend** (Go), jangan ikuti urutan di atas — baca
`backend/ARCHITECTURE.md` sebagai gantinya, jangan membaca file satu per satu.

### Auth & RBAC

- Login: Google OAuth via Supabase Auth SAJA — jangan tambahkan provider lain
  kecuali diminta eksplisit
- **Self-serve signup** (V2 Phase 2) — TIDAK ADA lagi status `pending`/gate
  approval admin. Role: `user` → `admin` saja (lihat `types/domain.ts` →
  `PlatformRole`), murni platform-ops flag, bukan gate akses
- **Identity split** (V2 Phase 1): `users` (privat — `email`, `role`, JANGAN
  di-join ke tampilan publik) + `profiles` (publik — `username`, `displayName`,
  `avatarUrl`, `bio`). Resolve nama/avatar tampilan SELALU lewat `profiles`,
  bukan `users`. Modul admin (User Management) lewat `userRepository`/
  `userService`; identity publik (Settings, `/@username`) lewat
  `profileRepository`/`profileService` — dua jalur, jangan dicampur
- Akses per-project ditentukan `project_members` (`role` + `status`
  `invited`/`accepted`/`declined`), bukan role global — lihat Project
  Membership di bawah
- Selalu konsumsi state auth via `useAuthContext()` (`hooks/useAuth.tsx`) —
  JANGAN panggil `supabase.auth.*` langsung dari component/page
- Route baru yang butuh login: bungkus dengan `<ProtectedRoute>` di `App.tsx`
  (sekarang hanya cek login, tidak ada lagi branch pending). Route khusus
  admin: tambahkan lagi `<AdminRoute>` di dalamnya
- RLS adalah lapisan keamanan yang sebenarnya — route guard di frontend cuma UX.
  Kalau menambah tabel baru, pastikan policy pakai helper (`is_approved()`,
  `is_admin()`, `has_project_access()`, dst) diterapkan, jangan biarkan permissive

### Project Membership: Invite/Accept (V2 Phase 4)

- `project_members` tidak lagi direct-add — lifecycle `status`:
  `invited` → `accepted`/`declined`
- Alur: manager buka Project Settings → Members → invite via
  `components/ui/UsernamePicker.tsx` → `projectMemberService.invite()` →
  insert row `status='invited'` + notifikasi. Invitee accept/decline dari
  bell notifikasi atau card "Pending Invitations" di `HomePage.tsx`
  (`useProjectInvitations`) → RPC `respond_to_project_invitation`
- `has_project_access()`/capability helpers HANYA menghitung
  `status='accepted'` — invited user belum dapat akses apa pun
- `useProjectAccessGuard.ts` — redirect ke `/` kalau role hilang saat user
  masih buka halaman project (bukan gate visibility)
- Project punya `visibility` (`private`\|`unlisted`\|`public`) — diatur di tab
  Danger Zone `ProjectSettingsPage.tsx`

### Notifications

- Tabel `notifications`, dibuat **client-side lewat RPC `create_notification`**
  (security definer) — BUKAN trigger database
- Baru dua tipe: `project_invite`, `project_member_removed` (dari
  `projectMemberService`). Kalau tambah tipe baru, ikuti pola sama — panggil
  `notificationService.create()` dari service layer terkait
- UI: bell + badge di `AppTopbar.tsx`, `NotificationPanel.tsx` (Sidebar
  slide-out) — polling 30 detik, bukan realtime push

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

- `docs/PRODUCT_CONSTITUTION.md` — Product vision, MVP scope, Feature Acceptance Rule (highest authority)
- `docs/PRD.md` — Product Requirements Document (Testing Domain, v1)
- `docs/ARCHITECTURE.md` — Technical architecture detail (Testing Domain, v1)
- `docs/ARCHITECTURE_V2.md` — Platform Context redesign (identity/ownership/visibility/membership)
- `docs/ROADMAP_V2.md` — V2 execution phases + task status
- `docs/TASKS.md` — Work breakdown v1 (Epic → Feature → Task)
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
