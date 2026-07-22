# ARCHITECTURE — TestManager (shiftech-test-mgr)

**Companion to:** [`docs/PRD.md`](PRD.md) (product/business view). Dokumen ini
adalah **technical/architectural** view: layering, data flow, dan skema
database.

**Stack (as built):** React 19 (TypeScript) · Vite 8 (SPA, tanpa SSR) ·
PrimeReact 10 · PrimeFlex · react-router-dom · Supabase (Postgres + auto REST
via `supabase-js`).

**Struktur repo:** monorepo `frontend/` (aplikasi React, `package.json` ada di
sini — semua command dijalankan dari dalam folder ini) + `backend/` (disiapkan
untuk migrasi masa depan ke PHP + SQLite, saat ini kosong) + `supabase/` (schema
SQL) + `docs/`.

---

## 1. System Architecture

### 1.1 Architectural Style

**Client-side SPA murni** — tidak ada backend custom, tidak ada API routes,
tidak ada SSR. React berjalan penuh di browser dan berkomunikasi langsung dengan
Supabase (Postgres) via `@supabase/supabase-js` (REST/PostgREST di baliknya).
Ini akan berubah kalau migrasi ke backend PHP terjadi (lihat §7) — karena itu
Repository sengaja dijaga sebagai satu-satunya layer yang boleh tahu tentang
Supabase.

Kenapa tidak butuh SSR/API routes untuk aplikasi seperti ini:

- Ini admin/internal tool, bukan halaman publik — tidak butuh SEO atau
  first-paint server-side
- Supabase sudah menyediakan REST endpoint otomatis dari skema Postgres — tidak
  perlu menulis endpoint sendiri
- Auth & authorization cukup ditangani via Supabase Row Level Security (RLS)
  jika diperlukan nanti

**Layered architecture:**

```
Page/Component → Hook → Service (business logic) → Repository (raw query) → Supabase (Postgres)
                                                          ↘ helpers/mappers.ts (row ↔ domain)
```

### 1.2 Kenapa layer ini dan bukan "fetch langsung di komponen"?

Tujuan eksperimen ini adalah memvalidasi bahwa pola clean architecture backend
(Controller→Service→Repository, seperti di [amanah-pos](../amanah-pos)) bisa
direplikasi di sisi frontend SPA, supaya:

- Business rule (validasi, kalkulasi summary) tidak tercampur dengan kode UI
- Repository bisa diganti (mis. Supabase → Firebase → REST API lain) tanpa
  mengubah service/component
- Mudah di-test terpisah per layer (meski test suite belum ditulis di iterasi
  awal ini)

---

## 2. Layer Detail

Semua path relatif terhadap `frontend/src/`.

### 2.1 Repository (`repositories/*.ts`)

- Satu file per aggregate root: `projectRepository`, `moduleRepository`,
  `tagRepository`, `testPlanRepository`, `testCaseRepository`,
  `testRunRepository`, `testResultRepository`, `issueRepository`,
  `profileRepository`
- Isinya HANYA: query Supabase (`.select`, `.insert`, `.update`, `.delete`) +
  panggil mapper dari `helpers/mappers.ts`
- Tidak ada validasi, tidak ada business rule
- Contoh: `testPlanRepository.findAllByProject(projectId)` — query mentah,
  return `TestPlan[]`

### 2.2 Service (`services/*.ts`)

- Business logic & validasi input (mis. `testCaseService.create` menolak title
  kosong)
- Orkestrasi lintas repository — contoh non-trivial:
  `testRunService.start(testPlanId, name)` membaca cakupan test case dari
  `testCaseRepository.findCasesForPlan`, membuat row `test_runs`, lalu men-seed
  satu `test_results` (`not_run`) untuk tiap test case dalam cakupan;
  `testRunService.getWithResults(testRunId)` menghitung summary
  (pass/fail/skip/blocked/progress%) on-the-fly dari `test_results`, tidak
  pernah menyimpannya sebagai kolom
- Dipanggil oleh hooks (untuk fetch-on-mount) atau langsung oleh page (untuk
  aksi user seperti submit form)

### 2.3 Helper (`src/helpers/*.ts`)

- Fungsi murni, tanpa side effect, tanpa dependency ke Supabase/React
- `mappers.ts` — konversi row Supabase (snake_case) ↔ domain type (camelCase).
  Semua repository WAJIB lewat sini, tidak boleh mapping manual berulang
- `dateFormatter.ts` — format tanggal untuk tampilan (locale `id-ID`)

### 2.4 Hook / Composable (`src/hooks/*.ts`)

- Analog "composable" di Vue — jembatani React lifecycle (`useState`,
  `useEffect`) dengan service layer
- Pola standar: `use{Entity}(param)` → return `{ data, loading, error, reload }`
- Tidak ada business logic di sini — murni state management + pemanggilan
  service

### 2.5 Component & Page (`src/components/`, `src/pages/`)

- `components/layout/` — shell aplikasi (Menubar navigasi via PrimeReact)
- `components/ui/` — komponen reusable generik lintas halaman (kosong di awal,
  isi sesuai kebutuhan, mis. `ConfirmDeleteDialog`, `StatusTag`)
- `pages/{module}/` — satu halaman = satu route, isi: panggil hook untuk baca
  data, panggil service untuk aksi tulis (create/update/delete), render
  PrimeReact components

Component/Page **tidak pernah** mengimpor `supabase` client atau repository
secara langsung.

---

## 3. Data Flow Example — Menambah Test Plan Baru

```
1. User isi form di TestPlansPage → klik "Simpan"
2. Page memanggil testPlanService.create({ projectId, name, description })
3. Service validasi: name tidak boleh kosong → trim input
4. Service memanggil testPlanRepository.create(...)
5. Repository insert ke Supabase, ambil row hasil insert
6. Repository map row (snake_case) → TestPlan (camelCase) via mappers.ts
7. Service return TestPlan ke Page
8. Page memanggil reload() dari useTestPlans hook untuk refresh DataTable
```

---

## 4. Database Schema (Supabase / Postgres)

Didefinisikan di lima file, **dijalankan berurutan** di Supabase SQL Editor
(masing-masing bergantung pada tabel/fungsi dari file sebelumnya):

1. [`supabase/schema.sql`](../supabase/schema.sql) — domain tables awal
2. [`supabase/schema_auth.sql`](../supabase/schema_auth.sql) — auth/RBAC
   (`profiles`, trigger, RLS awal)
3. [`supabase/schema_project_lifecycle.sql`](../supabase/schema_project_lifecycle.sql)
   — kolom `projects.status`, soft-delete `profiles.deleted_at`
4. [`supabase/schema_test_management_v2.sql`](../supabase/schema_test_management_v2.sql)
   — `modules`, `tags`, `test_case_tags`, `test_runs`, `test_results`, `issues`;
   reshape `test_cases` (+module_id, objective, notes, status active/archived)
   dan `test_plan_cases` (kolom hasil dihapus)
5. [`supabase/schema_entity_codes.sql`](../supabase/schema_entity_codes.sql) —
   kolom `code` auto-generate (`MOD-####`/`TC-####`/`TP-####`/`TR-####`) di
   `modules`, `test_cases`, `test_plans`, `test_runs`
6. `supabase/schema_issue_tracking_v2.sql` (rencana, E12) — reshape `issues`
   jadi entity level-project (`project_id` wajib, `module_id` nullable,
   `test_result_id` **dihapus**), tabel `issue_test_results` (junction N:M ke
   `test_results`), `issue_tags` (junction ke `tags`), kolom `type` (enum) dan
   `github_links` (`jsonb`)
7. `supabase/schema_test_case_steps.sql` (rencana, E12) — kolom
   `test_cases.step_type` (`simple`|`detailed`), tabel `test_case_steps`
   (template step per test case), tabel `test_result_steps` (hasil per step per
   Test Result)
8. `supabase/schema_attachments.sql` (rencana, E12) — tabel `attachments`
   (polymorphic ke `issues` untuk sekarang: `issue_id`, `storage_provider`,
   `url`, `file_name`, `file_size`, `content_type`)

| Tabel                   | Keterangan                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`              | Container utama: id, name, description, `status` (`active`\|`inactive`\|`archived`), timestamps. Index pada `status` dan `lower(name)`                                                                                       |
| `modules`               | Master per project: id, project_id, `code` (auto, editable), name. Unique per `(project_id, code)` dan `(project_id, name)`                                                                                                  |
| `tags`                  | Master per project: id, project_id, name. Unique per `(project_id, name)`. Dikelola dari tab "Tags" (rename/hapus) — pembuatan baru terjadi on-the-fly dari form Test Case                                                   |
| `test_case_tags`        | Junction many-to-many `test_case_id` ↔ `tag_id`                                                                                                                                                                              |
| `test_cases`            | Template pengujian: project_id, module_id (nullable), `code` (auto, editable), title, objective, preconditions, steps, expected_result, priority, `status` (`active`\|`archived`), notes, **`step_type`** (`simple`\|`detailed`, default `simple`, rencana E12). **Tidak pernah punya kolom hasil** |
| `test_case_steps`       | (rencana, E12) Template step, hanya relevan jika `step_type = 'detailed'`: test_case_id, step_number, action, expected_result                                                                                                |
| `test_plans`            | Rencana pengujian: `code` (auto, editable), name, description, status. Terikat ke `project_id`                                                                                                                               |
| `test_plan_cases`       | Junction `test_plan_id` ↔ `test_case_id` + **`order`** (sequence — urutan eksekusi, diubah via drag & drop di tab Test Cases) — HANYA cakupan, tanpa kolom hasil (kolom `last_result`/`notes` versi lama sudah dihapus)      |
| `test_runs`             | Satu sesi eksekusi: test_plan_id, `code` (auto, editable), name, `status` (`in_progress`\|`completed`, manual), started_at, completed_at                                                                                     |
| `test_results`          | Satu baris per (test_run_id × test_case_id) — unique constraint pada pasangan ini. Kolom: tester_id (FK `profiles`), `status` (`pass`\|`fail`\|`skip`\|`blocked`\|`not_run`), executed_at, notes, **`order`** (snapshot `test_plan_cases.order` saat run dimulai — lihat §4.0). **Di sinilah hasil hidup** |
| `test_result_steps`     | (rencana, E12) Hasil per-step untuk Test Case `detailed`: test_result_id, test_case_step_id, status (`pass`\|`fail`), actual_result                                                                                          |
| `issues`                | (reshape E12) Entity level-project: `project_id` (wajib), `module_id` (nullable), `type` (`bug`\|`feature`\|`improvement`\|`task`), title, description, actual_result, expected_result, priority, status, assigned_to (FK `profiles`), `github_links` (`jsonb`). Kolom `test_result_id` versi lama **dihapus**, diganti junction `issue_test_results` |
| `issue_test_results`    | (rencana, E12) Junction N:M `issue_id` ↔ `test_result_id`                                                                                                                                                                    |
| `issue_tags`            | (rencana, E12) Junction many-to-many `issue_id` ↔ `tag_id`, reuse tabel `tags`                                                                                                                                               |
| `attachments`           | (rencana, E12) `issue_id`, `storage_provider`, `url`, `file_name`, `file_size`, `content_type`                                                                                                                               |
| `entity_code_sequences` | Bookkeeping internal: satu row per `(project_id, prefix)`, menyimpan `last_value` counter. Dipakai fungsi `next_entity_code()`                                                                                               |
| `profiles`              | 1:1 dengan `auth.users` (Supabase Auth). Kolom: `email`, `full_name`, `avatar_url`, `role` (`pending`\|`user`\|`admin`), `deleted_at` (soft-delete)                                                                          |

Semua tabel punya trigger `updated_at` otomatis kecuali `test_plan_cases` dan
`tags` (tidak perlu — hanya insert/delete, tidak pernah update in-place) dan
`test_case_tags`/`issues` sisi junction murni.

### 4.-1 Kode Entity Auto-Generate (MOD-####, TC-####, TP-####, TR-####)

- Fungsi SQL `next_entity_code(project_id, prefix)` — upsert row di
  `entity_code_sequences` (increment `last_value`), return
  `{prefix}-{lpad(nomor, 4, '0')}`. Race-safe karena terjadi dalam satu
  statement `insert ... on conflict do update ... returning`
- Trigger `before insert` di masing-masing tabel (`set_module_code`,
  `set_test_case_code`, `set_test_plan_code`, `set_test_run_code`) — HANYA
  mengisi `code` kalau kosong/null. Kode yang dikirim eksplisit dari client
  (user mengetik manual di form) tidak pernah ditimpa
- `test_runs` tidak punya `project_id` langsung (hanya `test_plan_id`) — trigger
  `set_test_run_code` resolve `project_id` lewat join ke `test_plans` supaya
  sequence tetap konsisten per project, bukan per test plan
- Sisi frontend: `repository.create(...)` selalu mengirim
  `code: input.code || undefined` — string kosong/undefined membuat Supabase
  tidak menyertakan kolom itu di INSERT sama sekali, sehingga trigger DB yang
  mengisi. User bisa isi field "Kode" di form kalau mau override, dibiarkan
  kosong untuk default otomatis
- Kode SELALU bisa diedit setelahnya lewat `service.update(id, { code, ... })` —
  bukan generated column read-only

### 4.0 Test Management Workflow (mengapa modelnya begini)

```
Project → Module → Test Case (template, resultless)
Project → Test Plan → Test Run → Test Result → Issue (0..N, jika FAIL)
```

Keputusan desain inti (lihat `docs/PRD.md` §3 untuk rationale produk lengkap):

- **Test Case tidak pernah menyimpan hasil.** Versi awal aplikasi ini sempat
  menyimpan `last_result` langsung di `test_plan_cases`, yang berarti re-run
  menimpa hasil sebelumnya. Model v2 memisahkan ini: `test_plan_cases` murni
  cakupan, `test_results` yang menyimpan hasil, satu baris per Test Run.
- **Test Run baru untuk setiap sesi eksekusi.** `testRunService.start()`
  men-snapshot cakupan test case plan **saat itu** ke `test_results` baru
  (`not_run`) — perubahan cakupan plan setelahnya tidak mengubah retroaktif apa
  yang tercakup dalam run yang sudah dimulai.
- **Sequence (urutan eksekusi) hidup di `test_plan_cases.order`, bukan entity
  Test Suite terpisah.** Drag & drop di tab Test Cases (`TestPlanDetailPage`)
  memanggil `testPlanService.reorderCases()`, yang menulis ulang `order`
  seluruh baris jadi index array baru — sengaja hanya aktif saat tidak ada
  filter/search aktif (`isCaseFilterActive`), supaya reorder selalu terhadap
  daftar penuh, bukan subset hasil filter yang bisa menghasilkan `order` yang
  salah. `testResultRepository.seedForRun()` men-snapshot posisi ini ke
  `test_results.order` di saat run dimulai (pola sama seperti snapshot konten
  test case lain) — jadi run yang sudah berjalan tidak berubah urutannya kalau
  plan di-reorder setelahnya. **Sequence ini panduan, bukan pembatas**:
  `testRunService.recordResult()` tidak pernah memvalidasi urutan pencatatan
  hasil — tester bebas mencatat hasil test case manapun kapan saja.
- **Completion manual, progress otomatis.** `test_runs.status` HANYA berubah
  lewat `testRunService.complete()`/`reopen()` (aksi eksplisit user) — tidak
  pernah disimpulkan otomatis dari semua `test_results` terisi. Sebaliknya,
  ringkasan progress (jumlah pass/fail/skip/blocked, persentase) SELALU dihitung
  on-the-fly di `testRunService.getWithResults()`, tidak pernah disimpan sebagai
  kolom — supaya selalu akurat tanpa risiko cache basi.
- **Issue adalah entity level-project, relasi ke Test Result N:M (bukan lagi
  1:many searah)** — reshape dari v1: sebelumnya `issues.test_result_id`
  wajib (issue tidak bisa berdiri sendiri). Sekarang Issue punya
  `project_id` sendiri, bisa dibuat standalone (feature request, temuan
  general) atau ditautkan ke satu/banyak Test Result lewat junction
  `issue_test_results`. Rationale: satu kegagalan yang sama kadang muncul lagi
  di run berikutnya — tim ingin menautkan Test Result baru itu ke Issue yang
  sudah ada, bukan membuat Issue duplikat.
- **Tester wajib user terdaftar** (`test_results.tester_id references profiles`)
  — bukan teks bebas, supaya riwayat testing selalu bisa ditelusuri ke akun yang
  jelas.

### 4.1 Auth & RBAC

- **Provider**: Google OAuth via Supabase Auth
  (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- **Auto-provisioning**: trigger `handle_new_user()` di `auth.users` (AFTER
  INSERT) otomatis membuat row `profiles` dengan `role = 'pending'` setiap ada
  signup baru — tidak ada langkah manual untuk ini
- **Role check helpers**: dua fungsi SQL `security definer` untuk menghindari
  RLS recursion saat query `profiles` dari dalam policy tabel lain:
  - `is_admin()` — true jika `profiles.role = 'admin'` untuk `auth.uid()` saat
    ini
  - `is_approved()` — true jika role `user` atau `admin`
- **Admin pertama**: TIDAK ada mekanisme otomatis (sengaja) — di-set manual via
  Supabase Table Editor
  (`update profiles set role = 'admin' where email = '...'`) setelah user tsb
  login sekali

**Row Level Security:**

- `profiles` — user hanya boleh baca profil sendiri (dan hanya jika belum
  di-soft-delete); admin boleh baca semua + update role siapa pun
- `projects`, `test_plans`, `test_cases`, `test_plan_cases`, `modules`, `tags`,
  `test_case_tags`, `test_runs`, `test_results`, `issues` — hanya
  `is_approved()` (role `user`/`admin`) yang boleh CRUD. User dengan role
  `pending` diblokir di level database, bukan cuma di level UI

Kebijakan permissive (`using (true)`) yang sebelumnya ada di `schema.sql` sudah
**digantikan** oleh policy berbasis role ini setelah `schema_auth.sql`
dijalankan.

---

## 5. UI Architecture — PrimeReact

- **Versi**: PrimeReact **10.x** (stable, classic theme system). PrimeReact v11
  sengaja dihindari karena masih preview dengan sistem theming baru
  (`@primereact/themes`) yang belum stabil/tersedia penuh di npm saat repo ini
  dibuat.
- **Tema**: `lara-light-blue`, diimpor sekali di `main.tsx`
- **Provider**: `<PrimeReactProvider>` membungkus seluruh app di `main.tsx`
- **Layout utility**: PrimeFlex (`flex`, `gap-*`, `align-items-center`, dll) —
  hindari menulis CSS custom kecuali PrimeFlex tidak cukup
- **Komponen andalan**: `DataTable` + `Column` untuk semua listing, `Dialog`
  untuk form modal, `Tag` untuk status/priority badge, `ProgressBar` untuk
  ringkasan progress test plan

---

## 6. Cross-Cutting Concerns

| Concern             | Implementasi                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data fetching cache | `@tanstack/react-query` terpasang, siap dipakai bertahap (belum dipakai di semua hook awal)                                                        |
| Form validation     | `react-hook-form` + `zod` terpasang, siap dipakai bertahap                                                                                         |
| Routing             | `react-router-dom`, definisi di `App.tsx`                                                                                                          |
| Environment config  | `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), divalidasi di `config/supabaseClient.ts`                                                   |
| Auth & session      | `AuthProvider` (`hooks/useAuth.tsx`) — context global berisi `session`, `profile`, `isAdmin`, `isApproved`, `isPending`                            |
| Route guard         | `ProtectedRoute` (redirect ke `/login` atau `/pending-approval`), `AdminRoute` (redirect ke `/` jika bukan admin) — keduanya di `components/auth/` |

### 6.1 Auth Architecture Detail

```
main.tsx: <AuthProvider> membungkus <App> (butuh BrowserRouter untuk redirect)
  useAuth.tsx:
    - Load session Supabase saat mount (getSession) + subscribe onAuthStateChange
    - Setiap session berubah → load row `profiles` terkait via profileService
    - Expose: session, profile, isAdmin, isApproved, isPending, signInWithGoogle(), signOut()

App.tsx routing:
  /login, /pending-approval           → public, tidak digenerate lewat guard
  <ProtectedRoute>                    → wajib session + role approved (user/admin)
    <AppLayout>                       → shell dengan menu (menu "User Management" hanya muncul jika isAdmin)
      /, /test-plans, /test-cases     → semua approved user
      <AdminRoute>
        /users                        → hanya admin (UserManagementPage)
```

**Penting:** route guard di frontend HANYA untuk UX (sembunyikan menu/redirect)
— bisa dibypass di client. Keamanan sesungguhnya ada di **RLS Supabase** (lihat
§4.1), yang berlaku di level database terlepas dari apa yang dilakukan di
browser.

### 6.2 Modul User Management (`src/pages/users/UserManagementPage.tsx`, `UserDetailPage.tsx`)

Mengikuti pola layer yang sama seperti modul lain, diadaptasi dari pola CRUD
User di [amanah-pos](../amanah-pos) (lihat `docs/PRD.md` §4.8 untuk detail
per-aksi):

```
UserManagementPage → useProfiles hook → profileService → profileRepository → Supabase (`profiles` table)
```

- `profileService.approve(id)` — set role `pending` → `user`
- `profileService.promoteToAdmin(id)` / `demoteToUser(id)` — ubah role `user` ↔
  `admin`
- `profileService.revokeAccess(id)` — pengganti "reset password" amanah-pos
  untuk konteks Google OAuth (tidak ada password untuk di-reset): role
  dikembalikan ke `pending`
- `profileService.remove(id)` — **soft delete** (`profiles.deleted_at`), BUKAN
  hard delete. Mengikuti pola `BaseModel` soft-delete amanah-pos, tapi lebih
  sederhana (tidak perlu rename kolom unique karena `profiles.id` =
  `auth.users.id`, bukan kolom yang bisa konflik)
- Soft-deleted profile otomatis diblokir oleh `is_admin()`/`is_approved()` di
  RLS (lihat `schema_project_lifecycle.sql`) — bukan cuma disembunyikan di UI
- Admin tidak bisa revoke/hapus/demote akun sendiri — dicek di
  `UserManagementPage.tsx` dengan `row.id === currentProfile?.id`, sejalan
  dengan `UserPolicy` amanah-pos yang melarang self-edit/self-delete

### 6.3 Modul Test Run, Test Result, Issue

```
TestPlanDetailPage (tab "Test Runs") → useTestRuns hook → testRunService.listByPlan/start → testRunRepository
TestRunsPage (lintas project, di sidebar) → testRunService.listByProject → testRunRepository.findAllByProject (join test_plans utk nama plan)
TestRunDetailPage → useTestRunDetail hook → testRunService.getWithResults → testResultRepository (+ join test_cases, profiles)
TestRunIssuesPage → useIssuesByTestRun hook → issueService.listByTestRun → issueRepository (+ join profiles untuk assignee)
```

- **Test Runs lintas project** (`/test-runs`, item sidebar): mengikuti pola
  `TestCasesPage`/`TestPlansPage` — dropdown pilih project, tabel semua run dari
  semua Test Plan dalam project itu. `testRunRepository.findAllByProject` join
  lewat `test_plans!inner(project_id, name)` karena `test_runs` sendiri tidak
  punya kolom `project_id`
- **Mulai run**: dialog di tab "Test Runs" pada `TestPlanDetailPage` →
  `testRunService.start(testPlanId, name)` → redirect ke `/test-runs/:id` begitu
  berhasil
- **Catat hasil**: dialog "Catat Hasil Eksekusi" di `TestRunDetailPage` —
  dropdown status (pass/fail/skip/blocked), dropdown tester (hanya user dengan
  role `user`/`admin`, di-fetch via `profileService.listAll()` lalu difilter di
  halaman — belum ada endpoint khusus "list approved users" di service layer,
  cukup untuk skala saat ini), textarea catatan
- **Buat Issue**: tombol bendera muncul hanya pada baris `status === 'fail'` —
  dialog pre-fill `expectedResult` dari Test Case terkait, redirect ke
  `/test-runs/:id/issues` setelah dibuat
- **Kelola Issue**: `TestRunIssuesPage` — dropdown status dan assignee inline di
  kolom tabel (ubah langsung tanpa dialog terpisah, beda dari pola dialog di
  halaman lain — dipilih karena aksinya cuma 1 field per kolom)

> **Catatan (E12):** bagian di atas mendeskripsikan v1 (Issue anak Test
> Result, 1:many). Lihat §6.6 untuk reshape jadi Issue level-project dengan
> relasi N:M — halaman/flow di atas berubah signifikan.

### 6.6 Issue & Feature Tracking v2 (rencana, E12)

```
IssuesPage (/projects/:id/issues) → useIssues hook → issueService.listByProject → issueRepository (+ join module, tags, assignee)
TestRunDetailPage (baris Test Result) → dialog "Link Issue" → issueService.listByProject (untuk dipilih) atau issueService.create (inline, lalu link) → issueService.linkToTestResult(issueId, testResultId)
```

- **Reshape skema**: `issues.test_result_id` (FK wajib) dihapus, diganti
  `issues.project_id` (wajib) + `issues.module_id` (nullable) + junction
  `issue_test_results` (N:M) + junction `issue_tags` (N:M, reuse `tags`)
- **Halaman Issue baru** (`pages/issues/IssuesPage.tsx`, route
  `/projects/:id/issues` atau tab di `ProjectDetailPage` — pola sama seperti
  Test Cases/Modules/Tags): list, filter (type/status/priority/module/tag),
  CRUD penuh, kolom "Ditautkan ke N Test Result" (link ke detail run terkait)
- **Dialog "Link Issue" di Test Run**: dipicu dari baris Test Result (bukan
  cuma yang FAIL — sekarang bisa dari status apa pun, karena Issue tak lagi
  terikat wajib ke FAIL). Dua tab/mode dalam satu dialog:
  1. **Pilih existing** — daftar issue project (searchable), centang lalu
     simpan → insert baris `issue_test_results`
  2. **Buat baru** — form issue singkat (title, type, priority, description)
     tanpa pindah halaman → `issueService.create()` lalu langsung
     `issueService.linkToTestResult()` dalam satu aksi
- `issueRepository.listByTestResult(testResultId)` / `listByProject(projectId)`
  — dua entry point baca yang berbeda, keduanya join lewat `issue_test_results`
  kalau perlu
- `TestRunIssuesPage` (`/test-runs/:id/issues`) tetap ada sebagai **view**:
  join `issue_test_results` → `test_results` untuk run tsb, bukan lagi listing
  langsung dari kolom FK
- **Attachment**: `attachmentService` di belakang `StorageAdapter` interface
  (`upload(file): Promise<{url, ...}>`, `remove(url)`) — implementasi awal
  `SupabaseStorageAdapter`, disiapkan slot untuk `InternalBackendAdapter` di
  masa depan tanpa mengubah pemanggil (service/UI hanya bicara ke interface,
  bukan provider konkret)
- **Test Case Step (detailed mode)**: `test_case_steps` (template) ditampilkan
  di form Test Case ketika `step_type = 'detailed'` (tabel baris step yang bisa
  ditambah/dihapus/reorder). Saat Test Run mulai, `testRunService.start()`
  ikut men-seed `test_result_steps` (`not_run`/kosong) untuk tiap step dari
  test case `detailed` dalam cakupan — mirip pola seeding `test_results` yang
  sudah ada
- **GitHub links**: field `github_links` (`jsonb` array `{url, label?}`) di
  form Issue — input dinamis (tambah/hapus baris), murni teks, tidak ada
  validasi format GitHub API

### 6.4 Modul Module & Tag

- **Module**: CRUD sederhana (`moduleRepository`/`moduleService`/`useModules`) —
  dikelola dari tab "Modules" di `ProjectDetailPage`, dipakai sebagai dropdown
  nullable di form Test Case
- **Tag**: dua jalur berbeda yang sama-sama lewat `tagRepository`/`tagService`:
  1. **Pembuatan on-the-fly** dari form Test Case —
     `tagService.saveTagsForTestCase(projectId, testCaseId, tagNames)`: setiap
     nama di-resolve lewat `tagRepository.findOrCreate` (cari case-insensitive
     dulu, insert kalau belum ada), lalu junction `test_case_tags` di-replace
     penuh (delete semua, insert ulang). Input UI-nya `Chips` PrimeReact (ketik
     teks bebas, Enter untuk commit)
  2. **Kelola tag yang sudah ada** — tab "Tags" di `ProjectDetailPage`: list
     semua tag project, `tagService.rename(id, name)`/`tagService.remove(id)`.
     Tidak ada tombol "buat tag baru" di tab ini secara sengaja — pembuatan
     tetap lewat form Test Case supaya tag selalu langsung terpakai, bukan
     daftar kosong yang perlu diisi manual dulu

### 6.5 Modul Project Lifecycle (`src/pages/projects/ProjectsPage.tsx`, `ProjectDetailPage.tsx`)

Diadaptasi dari pola list Customer di amanah-pos (search + filter + sort +
status toggle + detail bertab), disesuaikan: dua level status tambahan
(`inactive`/`archived`) dan **hapus permanen sungguhan** (bukan soft-delete
seperti amanah-pos, karena diminta eksplisit).

- **Search/filter/sort**: state (`search`, `statusFilter`, `sortField`,
  `sortDirection`) di `ProjectsPage` di-lift ke `ProjectQuery`, dilempar ke
  `useProjects(query)` hook → `projectService.list(query)` →
  `projectRepository.findAll(query)` yang membangun query Supabase (`ilike`
  untuk search, `eq` untuk filter status, `order` untuk sort) —
  filtering/sorting terjadi di database, bukan di client
- **Status lifecycle**: `projectService.changeStatus(id, status)` — tidak
  melalui form Save biasa, tapi lewat menu aksi (`Menu` PrimeReact) per baris,
  mengikuti pola amanah-pos yang memisahkan aksi "ubah status" dari form edit
  biasa (walau di amanah-pos status tetap 1 field di Save form — di sini dipisah
  karena ada 3 nilai, bukan cuma toggle boolean)
- **Hapus Permanen**: `projectService.deletePermanently(id)` →
  `DELETE FROM projects WHERE id = ...` — mengandalkan `on delete cascade` di FK
  `test_plans.project_id`/`test_cases.project_id` untuk ikut menghapus data
  anak. **Tidak ada fitur restore.** Diproteksi `ConfirmDialog` dengan pesan
  eksplisit menyebut konsekuensinya
- **Detail page** (`/projects/:id`): info project + tab
  `Test Plans`/`Test Cases`/`Modules` — pola tab ini meniru `Detail.vue`
  Customer amanah-pos yang punya beberapa tab riwayat

---

## 7. Architectural Risks & Notes

| Risiko                                                      | Keterangan                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tidak ada test suite                                        | Belum ada Vitest/Testing Library — tambahkan jika project ini berkembang lebih jauh                                                                                                                                                                                                                                                                                  |
| PrimeReact v11 belum dipakai                                | Perlu revisit saat versi stable-nya rilis dengan sistem tema yang jelas                                                                                                                                                                                                                                                                                              |
| Bundle size                                                 | Build menghasilkan chunk >1MB (belum code-split) — cukup untuk skala aplikasi internal ini, revisit kalau modul terus bertambah                                                                                                                                                                                                                                      |
| Admin pertama manual                                        | Tidak ada seed/CLI untuk assign admin pertama — harus lewat Supabase Table Editor. Didokumentasikan, bukan bug                                                                                                                                                                                                                                                       |
| Google OAuth redirect                                       | `redirectTo: window.location.origin` — pastikan URL ini terdaftar di Supabase Auth settings (Site URL & Redirect URLs) dan Google Cloud Console OAuth client, terutama saat deploy ke domain lain dari localhost                                                                                                                                                     |
| Migrasi ke backend PHP + SQLite (rencana, belum dikerjakan) | Repository layer sengaja jadi satu-satunya titik yang tahu tentang Supabase supaya migrasi ini nanti tinggal ganti isi repository (mis. jadi `fetch()` ke endpoint PHP) tanpa menyentuh service/hook/component. RLS Supabase (aturan akses per role) perlu direplikasi manual jadi authorization check di sisi PHP saat migrasi terjadi — tidak otomatis ikut pindah |
| Tag junction full-replace                                   | `tagService.saveTagsForTestCase` selalu delete+insert ulang seluruh `test_case_tags` untuk test case tsb saat disimpan — sederhana tapi berarti setiap save test case menyentuh baris junction meski tag tidak berubah. Cukup untuk skala saat ini (jumlah tag per test case kecil)                                                                                  |
| Reshape `issues` (E12) butuh migrasi data                    | Kalau sudah ada row `issues` lama (FK `test_result_id` wajib) sebelum migrasi E12 dijalankan, perlu backfill `project_id`/`module_id` via join `test_results → test_runs → test_plans` dan pindahkan relasi lama ke `issue_test_results` sebelum kolom `test_result_id` didrop — tidak otomatis                                                                     |
| Storage adapter (E12) pola baru di codebase                  | Interface + implementasi terpisah (`StorageAdapter`) belum ada contohnya di layer lain (Repository saat ini langsung bicara ke Supabase, bukan lewat interface) — jadi validasi pertama pola "swappable provider" di luar rencana migrasi backend PHP                                                                                                                |
