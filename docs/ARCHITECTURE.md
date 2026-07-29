# ARCHITECTURE — Testify (shiftech-test-mgr)

**Scope of this document: Testing Domain only** (Project → Module → Test
Case → Test Plan → Test Run → Test Result → Issue → Attachment) — layering,
data flow, and this domain's database schema. This is the part of the app
that **Platform Evolution V2 explicitly does not change** (see
[`docs/ARCHITECTURE_V2.md`](ARCHITECTURE_V2.md)'s "Testing Domain unchanged"
guarantee).

**For Platform Context** (identity/auth, project ownership & visibility,
membership invite/accept, Test Suite ownership) — the model described here in
§4.1 (Auth & RBAC) is the **pre-V2** shape. See
[`docs/ARCHITECTURE_V2.md`](ARCHITECTURE_V2.md) for the current shape
(`users`+`profiles` split, self-serve signup, `project_members.status`,
project `visibility`) and [`docs/ROADMAP_V2.md`](ROADMAP_V2.md) for what has
actually shipped. §4.1 below is kept for historical context on *why* the
original model looked the way it did; treat ARCHITECTURE_V2 as authoritative
for current Platform Context behavior.

**Companion to:** [`docs/PRD.md`](PRD.md) (product/business view, v1) and
[`docs/PRODUCT_CONSTITUTION.md`](PRODUCT_CONSTITUTION.md) (product vision,
highest authority).

**Stack (as built):** React 19 (TypeScript) · Vite (SPA, tanpa SSR) ·
PrimeReact 10 · PrimeFlex · react-router-dom · Supabase (Postgres + auto REST
via `supabase-js`).

**Struktur repo:** `landing/` (static landing page, served at `/`) +
`frontend/` (aplikasi React, `package.json` ada di sini — semua command
dijalankan dari dalam folder ini, served at `/app`) + `public-docs/` (Astro
Starlight docs site, served at `/docs` — user guide + data model, real
authored content) + `backend/` (Go backend, **PENDING/paused** — far more
built-out than a stub, see §7 and `backend/README.md`) + `supabase/` (schema
SQL + `migrations/`, the actual source of truth) + `docs/`. Deploy via
`deploy/deploy-vps.sh` (rsync + atomic symlink swap of all three built
outputs into one release directory).

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
Page/Component → Hook (React Query) → Service (business logic) → Repository (raw query) → Supabase (Postgres)
                        ↑                                                ↘ helpers/mappers.ts (row ↔ domain)
                        └── invalidateQueries ← useRealtimeSync ← postgres_changes (Supabase Realtime)
```

Read-side data fetching (bukan mutasi) sekarang selalu lewat **React Query**
(`@tanstack/react-query`), bukan `useState`+`useEffect` manual — lihat §2.4 dan
§2.6. Repository/Service/mapper tidak berubah oleh perubahan ini sama sekali;
React Query murni menggantikan cara Hook menyimpan & menyegarkan hasil
panggilan Service.

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

- Analog "composable" di Vue — jembatani React lifecycle dengan service layer
- Pola standar: `use{Entity}(param)` → return `{ data, loading, reload }` (nama
  field disesuaikan per entity, mis. `{ testPlans, loading, reload }`), tapi
  isinya sekarang **`useQuery`** dari `@tanstack/react-query`, bukan
  `useState`+`useEffect` manual — lihat §2.6 untuk detail penuh dan alasannya
- `reload()` yang dikembalikan hook memanggil
  `queryClient.invalidateQueries({ queryKey })`, bukan lagi query ulang manual
  yang menimpa `useState` lokal
- Tidak ada business logic di sini — murni pemetaan `useQuery` ke service layer
  + key registry (`hooks/queryKeys.ts`)

### 2.5 Component & Page (`src/components/`, `src/pages/`)

- `components/layout/` — shell aplikasi (Menubar navigasi via PrimeReact)
- `components/ui/` — komponen reusable generik lintas halaman (kosong di awal,
  isi sesuai kebutuhan, mis. `ConfirmDeleteDialog`, `StatusTag`)
- `pages/{module}/` — satu halaman = satu route, isi: panggil hook untuk baca
  data, panggil service untuk aksi tulis (create/update/delete), render
  PrimeReact components

Component/Page **tidak pernah** mengimpor `supabase` client atau repository
secara langsung.

### 2.6 Data Freshness — React Query + Realtime (E14)

**Masalah yang diperbaiki:** sebelum ini, `ProjectDetailPage` menyimpan hasil
fetch tiap tab dalam `Map` module-level (`tabDataCache`) yang hanya
di-invalidate lewat aksi di halaman itu sendiri. Menyelesaikan sebuah Test Run
dari `TestRunResultDetailPage` tidak punya cara memberi tahu cache tab "Test
Runs" di `ProjectDetailPage` — hasilnya tampilan lama tetap muncul sampai
di-refresh manual. Solusinya: ganti seluruh pola fetching manual dengan
**React Query**, dan tambahkan **Supabase Realtime** supaya perubahan dari tab
browser lain / user lain juga otomatis ter-refresh, bukan cuma perubahan dari
halaman lain di sesi yang sama.

**Dua bagian yang bekerja sama:**

1. **React Query sebagai satu-satunya cache.** Semua hook (`useProjects`,
   `useModules`, `useTestPlans`, `useTestPlanDetail`, `useTestRuns`,
   `useTestRunDetail`, `useIssuesByProject`/`useIssuesByTestRun`,
   `useProfiles`) dan semua fetch page-local (`ProjectDetailPage`,
   `TestPlanDetailPage`, `TestRunResultDetailPage`, `TestRunIssuesPage`,
   `TestCasesPage`, `TestCaseDetailPage`, `IssueDetailPage`) memanggil
   `useQuery` dengan **query key dari registry terpusat**
   (`hooks/queryKeys.ts`), bukan menyimpan hasil di `useState` lokal. Mutasi
   (create/update/delete) memanggil `queryClient.invalidateQueries({ queryKey })`
   dengan key yang sama persis — jadi kalau dua halaman berbeda membaca entity
   yang sama (mis. daftar Test Run tampil di `ProjectDetailPage` dan
   `TestPlanDetailPage`), mutasi di halaman manapun langsung menyegarkan
   keduanya, tanpa page saling tahu satu sama lain.
   - `ProjectDetailPage` sebelumnya punya dua cache module-level
     (`projectCache`, `tabDataCache`) — keduanya **dihapus total**, diganti 7
     `useQuery` terpisah (satu per slot tab: `testPlans`, `testCases`,
     `modules`, `tags`, `testRuns`, `issues`, `approvedUsers`)
   - `staleTime` default di-set `30_000` ms di `QueryClientProvider`
     (`main.tsx`) — hanya bandwidth default untuk navigasi cepat bolak-balik;
     invalidation eksplisit setelah mutasi selalu langsung, tidak menunggu
     `staleTime`
2. **Supabase Realtime sebagai trigger invalidation lintas klien.** Satu hook
   terpusat, `useRealtimeSync` (dipasang **sekali** di `AppLayout`, bukan per
   halaman/per hook), subscribe ke `postgres_changes` untuk 9 tabel:
   `test_results`, `test_runs`, `issues`, `test_plan_cases`, `test_cases`,
   `modules`, `tags`, `projects`, `profiles`. Tiap event memetakan payload
   (`payload.new`/`payload.old`) ke query key yang relevan lewat
   `queryKeys.ts` yang sama dipakai hook-hook di atas — jadi perubahan dari
   tab browser lain atau user lain otomatis memicu refetch, bukan cuma
   perubahan dari halaman lain di sesi yang sama.
   - Payload Realtime **tidak berisi join** — hanya kolom tabel itu sendiri.
     Untuk tabel yang tidak punya kolom FK yang dibutuhkan query (`test_runs`
     tidak punya `project_id`, hanya `test_plan_id`; `test_plan_cases` tidak
     punya `project_id`, hanya `test_plan_id`), keputusan produk: **invalidate
     prefix lebih luas** (mis. seluruh `['testRuns']`) alih-alih menambah query
     lookup tambahan per event — sedikit overfetch, tapi tanpa biaya round-trip
     database ekstra di jalur event handler
   - Migrasi `schema_realtime_sync.sql` meng-enable Realtime **replication**
     untuk 8 tabel di atas (`profiles` sudah lebih dulu di-enable, lihat §4.1
     "role approval realtime"). Tanpa `alter publication supabase_realtime add
     table ...`, `postgres_changes` tidak pernah terkirim ke client meski kode
     subscribe-nya benar — RLS SELECT policy juga wajib benar per tabel karena
     Realtime tunduk pada RLS yang sama seperti query biasa
   - Repository/Service **tidak disentuh sama sekali** oleh perubahan ini —
     `useRealtimeSync` hanya bicara ke `supabase` client (untuk subscribe) dan
     `queryClient` (untuk invalidate), tidak pernah memanggil service/repository

```
Client A tulis data → Supabase Postgres
                          ↓ (Realtime replication)
                    postgres_changes event → semua client subscribed
                          ↓
        queryClient.invalidateQueries({ queryKey: queryKeys.xxx(...) })
                          ↓
       React Query refetch otomatis → hook re-render → halaman update
```

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

**Dikelola via Supabase CLI** (`supabase/migrations/`, dijalankan dengan
`supabase db push` — lihat §4.-2), bukan lagi copy-paste manual ke Supabase SQL
Editor. File `supabase/schema_*.sql` di root folder tetap ada sebagai source
asli tiap perubahan, tapi yang benar-benar dieksekusi adalah salinannya di
`supabase/migrations/<timestamp>_<nama>.sql` — 19 file, berurutan berdasarkan
timestamp:

1. [`supabase/schema.sql`](../supabase/schema.sql) — domain tables awal
2. [`supabase/schema_auth.sql`](../supabase/schema_auth.sql) — auth/RBAC
   (`profiles`, trigger, RLS awal)
3. [`supabase/schema_project_lifecycle.sql`](../supabase/schema_project_lifecycle.sql)
   — kolom `projects.status`, soft-delete `profiles.deleted_at`
4. [`supabase/schema_test_management_v2.sql`](../supabase/schema_test_management_v2.sql)
   — `modules`, `tags`, `test_case_tags`, `test_runs`, `test_results`, `issues`;
   reshape `test_cases` (+module_id, objective, notes, status active/archived)
   dan `test_plan_cases` (kolom hasil dihapus)
5. `schema_entity_codes.sql` — kolom `code` auto-generate
   (`MOD-####`/`TC-####`/`TP-####`/`TR-####`)
6. `schema_issue_code.sql` — kolom `code` auto-generate untuk `issues`
   (`ISS-####`)
7. `schema_test_result_snapshot.sql` — kolom snapshot konten test case di
   `test_results` (`test_case_title`, `test_case_steps`, dst)
8. `schema_project_members.sql` — tabel `project_members`, akses per-project
9. `schema_project_roles.sql` — role granular per-project
   (`manager`/`supervisor`/`tester`/`member`), RLS di-split per-operasi
10. `schema_test_run_notes.sql` — kolom `test_runs.notes`
11. **`schema_issue_tracking_v2.sql`** (E12) — reshape `issues` jadi entity
    level-project (`project_id` wajib, `module_id` nullable, `test_result_id`
    **dihapus**), tabel `issue_test_results` (junction N:M ke `test_results`),
    `issue_tags` (junction ke `tags`), kolom `type` (enum) dan `github_links`
    (`jsonb`, kolom ini di-rename jadi `external_links` di
    `20260729000002_rename_github_links_to_external_links.sql`)
12. **`schema_test_case_steps.sql`** (E12) — kolom `test_cases.step_type`
    (`simple`|`detailed`), tabel `test_case_steps` (template step per test
    case), tabel `test_result_steps` (hasil per step per Test Result)
13. **`schema_attachments.sql`** (E12) — tabel `attachments` (`issue_id`,
    `storage_provider`, `url`, `file_name`, `file_size`, `content_type`) +
    bucket Supabase Storage `attachments` (private, signed URL)
14. **`schema_test_run_order.sql`** (E13) — kolom `test_results.order`
    (snapshot `test_plan_cases.order` saat run dimulai — lihat §4.0
    "Sequence")
15. `schema_profiles_realtime.sql` — enable Realtime replication untuk
    `profiles` (dipakai fitur "role approval realtime" di §4.1)
16. **`schema_realtime_sync.sql`** (E14) — enable Realtime replication untuk
    8 tabel lain (`test_results`, `test_runs`, `issues`, `test_plan_cases`,
    `test_cases`, `modules`, `tags`, `projects`) — lihat §2.6
17. **`schema_custom_test_runs.sql`** (E16) — kolom `test_runs.project_id`
    (langsung, dibackfill dari `test_plans.project_id`), `test_plan_id` jadi
    **nullable** sehingga sebuah Test Run bisa dibuat langsung dari Test Case
    tanpa Test Plan ("unplanned/custom run"). Trigger `set_test_run_code()`
    dan RLS pada `test_runs`/`test_results`/`test_result_steps` ditulis ulang
    untuk resolve project via `project_id` langsung, bukan lagi join ke
    `test_plans` — pola yang sama seperti `issues.project_id` di E12
18. `20260722000001_auto_approve_signup.sql` — `handle_new_user()` diubah:
    user baru langsung berstatus `user` (bukan `pending`), skip approval
    manual admin. Tidak ada lagi mirror di root `supabase/schema_*.sql`
    mulai migrasi ini — `supabase/migrations/` jadi satu-satunya source of
    truth skema
19. **`20260723000001_test_case_templates.sql`** (E17) — tabel
    `test_case_templates`/`test_case_template_items`/`test_case_template_item_steps`
    (library global, TIDAK project-scoped — lihat §6.7), kolom
    `test_cases.target_role` (teks bebas untuk RBAC testing). RLS di sini
    bentuk BARU: `is_approved()` untuk select (siapa pun bisa browse/clone),
    `is_admin()` untuk insert/update/delete — berbeda dari semua tabel
    sebelumnya yang project-scoped atau "approved users, akses penuh"
20. **`20260725000001_rename_test_case_templates_to_test_suites.sql`** — rename
    murni (data preserved): `test_case_templates` → `test_suites`,
    `test_case_template_items` → `test_suite_items` (kolom `template_id` →
    `suite_id`), `test_case_template_item_steps` → `test_suite_item_steps`
    (kolom `template_item_id` → `suite_item_id`). Dipicu oleh rename menu UI
    "Test Case Templates" → "Test Suite" — nama tabel/kolom/kode disamakan
    supaya tidak drift dari label yang dilihat user (lihat §6.7)
21. `20260723000002_test_roles.sql` — tabel `test_roles` (master per project,
    pola sama seperti `modules`): `test_cases.target_role` (teks bebas)
    diganti jadi `target_role_id` (FK `test_roles`), backfill satu row
    `test_roles` per nilai teks distinct yang pernah ada per project. RLS
    "approved users, akses penuh" sama seperti `modules`/`tags`
22–29. **Migrasi Platform Evolution V2** (`20260725000002` s.d.
    `20260725000012`, lalu `20260727000013` s.d. `20260728000008`) — lihat
    [`docs/ARCHITECTURE_V2.md`](ARCHITECTURE_V2.md) §6/§7 dan
    [`docs/ROADMAP_V2.md`](ROADMAP_V2.md) untuk daftar lengkap & rationale per
    file (identity split `profiles`→`users`+`profiles`, drop approval gate,
    project `owner_id`/`visibility`, `project_members` invite/accept, Test
    Suite ownership/visibility, one-time username, notifications). Ringkasan
    migrasi terbaru yang menyentuh Testing Domain secara langsung:
    - `20260725000012_fix_test_suite_privacy_rls.sql` — perbaikan RLS
      visibility Test Suite (lihat ARCHITECTURE_V2 Phase 5)
    - `20260727000013_invited_user_project_read_access.sql` — user berstatus
      `invited` (belum accept) bisa baca `id`/`name`/`owner_id` project supaya
      kartu undangan tidak menampilkan "Unknown project"
    - `20260728000001_notifications.sql` — tabel `notifications` + RPC
      `create_notification()` (security definer) — lihat §6.8
    - `20260728000002_project_members_realtime.sql` — enable Realtime untuk
      `project_members` (invite/accept/remove ter-refresh lintas sesi)
    - `20260728000003_one_time_username.sql` — `profiles.username_changed` +
      trigger yang menolak perubahan username kedua kalinya
    - `20260728000004_delete_notifications_by_reference.sql` — RPC
      `delete_notifications_by_reference()` (bersihkan notifikasi undangan
      basi saat member di-remove)
    - `20260728000005`–`007` — debug RPC sementara untuk investigasi bug
      "invited user lihat Unknown project", lalu fix permanen
      (`20260728000006_invitation_rpc_security_definer.sql`: RPC
      `list_own_pending_invitations()`/`respond_to_project_invitation()`
      security definer, menggantikan ketergantungan langsung ke RLS table
      select/update untuk user yang belum accept), lalu drop RPC debug-nya
    - `20260728000008_supervisor_can_run_tests.sql` — `can_run_tests()`
      sekarang juga meng-grant role `supervisor` (label UI "Manager"),
      sejalan dengan perubahan `useProjectRole.ts`

| Tabel                   | Keterangan                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`              | Container utama: id, name, description, `status` (`active`\|`inactive`\|`archived`), **`owner_id`**/**`owner_type`** (V2 — polymorphic-ready, hanya `'user'` yang dipakai saat ini), **`visibility`** (`private`\|`unlisted`\|`public`, V2), timestamps. Index pada `status`, `lower(name)`, `owner_id`, dan `visibility` (partial, hanya `public`)                     |
| `project_members`       | Junction `project_id` ↔ `user_id` + `role` (`manager`\|`supervisor`\|`tester`\|`member`) + **`status`** (`invited`\|`accepted`\|`declined`, V2) + **`invited_by`**/**`invited_at`**/**`responded_at`** (V2) — akses & hak aksi per project, terpisah dari role global `users.role`. Hanya member `status='accepted'` (atau owner) yang dihitung `has_project_access()`. Lihat §4.1 dan `docs/ARCHITECTURE_V2.md` Phase 4                          |
| `modules`               | Master per project: id, project_id, `code` (auto, editable), name. Unique per `(project_id, code)` dan `(project_id, name)`                                                                                                  |
| `tags`                  | Master per project: id, project_id, name. Unique per `(project_id, name)`. Dikelola dari tab "Tags" (rename/hapus) — pembuatan baru terjadi on-the-fly dari form Test Case                                                   |
| `test_case_tags`        | Junction many-to-many `test_case_id` ↔ `tag_id`                                                                                                                                                                              |
| `test_roles`            | Master per project (migrasi #21): id, project_id, name — role APLIKASI YANG DITEST (mis. "Admin", "Manager"), bukan role internal. Menggantikan `test_cases.target_role` (dulu teks bebas) — pola & RLS sama seperti `modules`                                                    |
| `test_cases`            | Template pengujian: project_id, module_id (nullable), `code` (auto, editable), title, objective, preconditions, steps, expected_result, priority, `status` (`active`\|`archived`), notes, **`step_type`** (`simple`\|`detailed`, default `simple`), **`target_role_id`** (FK `test_roles`, nullable — sebelumnya teks bebas `target_role`, lihat migrasi #21). **Tidak pernah punya kolom hasil** |
| `test_case_steps`       | Template step, hanya relevan jika `step_type = 'detailed'`: test_case_id, step_number, action, expected_result                                                                                                                |
| `test_plans`            | Rencana pengujian: `code` (auto, editable), name, description, status. Terikat ke `project_id`                                                                                                                               |
| `test_plan_cases`       | Junction `test_plan_id` ↔ `test_case_id` + **`order`** (sequence — urutan eksekusi, diubah via drag & drop di tab Test Cases) — HANYA cakupan, tanpa kolom hasil                                                             |
| `test_runs`             | Satu sesi eksekusi: `project_id` (wajib, langsung — E16), `test_plan_id` (**nullable** — kosong berarti run "unplanned/custom", dibuat langsung dari Test Case tanpa Test Plan), `code` (auto, editable, unique per `project_id`), name, `status` (`in_progress`\|`completed`, manual), started_at, completed_at, notes |
| `test_results`          | Satu baris per (test_run_id × test_case_id) — unique constraint pada pasangan ini. Kolom: tester_id (FK `profiles`), `status` (`pass`\|`fail`\|`skip`\|`blocked`\|`not_run`), executed_at, notes, snapshot konten test case (`test_case_title`, `test_case_steps`, dst), **`order`** (snapshot `test_plan_cases.order` saat run dimulai — lihat §4.0). **Di sinilah hasil hidup** |
| `test_result_steps`     | Hasil per-step untuk Test Case `detailed`: test_result_id, test_case_step_id, status (`pass`\|`fail`\|`not_run`), actual_result                                                                                              |
| `issues`                | Entity level-project (reshape E12): `project_id` (wajib), `module_id` (nullable), `type` (`bug`\|`feature`\|`improvement`\|`task`), title, description, actual_result, expected_result, priority, status, assigned_to (FK `profiles`), `external_links` (`jsonb`, awalnya bernama `github_links` — lihat §Migration Log). Tidak lagi punya `test_result_id` — relasi ke Test Result lewat junction `issue_test_results` |
| `issue_test_results`    | Junction N:M `issue_id` ↔ `test_result_id`                                                                                                                                                                                   |
| `issue_tags`            | Junction many-to-many `issue_id` ↔ `tag_id`, reuse tabel `tags`                                                                                                                                                              |
| `attachments`           | `issue_id`, `storage_provider`, `url`, `file_name`, `file_size`, `content_type` — lihat §6.6 untuk `StorageAdapter`                                                                                                          |
| `entity_code_sequences` | Bookkeeping internal: satu row per `(project_id, prefix)`, menyimpan `last_value` counter. Dipakai fungsi `next_entity_code()`                                                                                               |
| `test_suites`           | **Global (E17), TIDAK project-scoped** — library reusable ("Test Suite" di UI), dikelola admin: name, description. Nama tabel semula `test_case_templates` (lihat migrasi #20). Lihat §6.7                                  |
| `test_suite_items`      | Item di dalam suite: `suite_id`, `module_name`/`tag_names` (teks bebas, di-resolve find-or-create ke project nyata saat clone), title, objective, preconditions, steps, expected_result, priority, `step_type`, `target_role`, `order_index`. Semula `test_case_template_items` |
| `test_suite_item_steps` | Step detail untuk item `step_type='detailed'`, sama seperti `test_case_steps` tapi untuk suite item. Semula `test_case_template_item_steps`                                                                                  |
| `users`                 | **V2 (rename dari `profiles` lama)** — 1:1 dengan `auth.users` (Supabase Auth), privat: `email`, `role` (`user`\|`admin`, platform-ops flag — TIDAK ADA lagi `pending`), `deleted_at` (soft-delete). Tidak pernah di-join ke tampilan publik |
| `profiles`              | **V2 (tabel baru, bukan lagi identity privat)** — 1:1 dengan `users`, publik: `username` (unique, sekali ganti — lihat `username_changed` + trigger `check_username_change`), `display_name`, `avatar_url`, `bio`. Ini yang di-resolve untuk nama/avatar tampilan di seluruh app |
| `notifications`         | Per-user (migrasi #24): `user_id` (FK `profiles`), `type` (`project_invite`\|`project_member_removed`), `title`, `body`, `reference_type`/`reference_id`, `is_read`. Dibuat **client-side** lewat RPC `create_notification()` (security definer) — BUKAN trigger DB. Lihat §6.8 |

Semua tabel punya trigger `updated_at` otomatis kecuali `test_plan_cases` dan
`tags` (tidak perlu — hanya insert/delete, tidak pernah update in-place) dan
`test_case_tags`/`issue_tags`/`issue_test_results` sisi junction murni.

### 4.-2 Migrasi via Supabase CLI

- `supabase/config.toml` — hasil `supabase init`, project sudah di-link ke
  remote via `supabase link --project-ref <ref>` (password database disimpan
  di `supabase/.env.local`, digitignore, tidak pernah commit)
- Migrasi baru: tambah file `.sql` ke `supabase/migrations/` dengan nama
  `<timestamp>_<deskripsi>.sql`, lalu `supabase db push --yes`
- Semua migrasi ditulis **idempotent** (`if not exists`, guard
  `do $$ ... end $$` untuk operasi yang tidak native idempotent seperti
  `alter publication ... add table`) — supaya aman dijalankan ulang kalau
  percobaan sebelumnya gagal di tengah jalan
- Setelah migrasi DDL besar (drop/rename kolom, drop policy), reload schema
  cache PostgREST secara manual kalau perlu: `NOTIFY pgrst, 'reload schema';`
  — PostgREST tidak selalu otomatis mendeteksi perubahan skema yang dilakukan
  lewat koneksi langsung/CLI (berbeda dari lewat Dashboard SQL Editor)

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

> **Superseded by Platform Evolution V2** (lihat `docs/ARCHITECTURE_V2.md`,
> `docs/ROADMAP_V2.md` — Phase 1/2/4, semua `done`). Poin-poin di bawah ini
> mendeskripsikan model **sebelum** V2 dan disimpan sebagai konteks historis
> (kenapa modelnya dulu begitu). Perubahan aktual yang sudah shipped:
> - `profiles` (lama, gabungan email+role+identity) di-**split** jadi `users`
>   (privat: email/role) + `profiles` (publik: username/displayName/
>   avatarUrl/bio, tabel baru)
> - Status `pending` **dihapus total** — signup self-serve, `role` langsung
>   `user`. `is_approved()` sekarang berarti "akun aktif (belum soft-delete)",
>   bukan lagi "sudah di-approve admin"
> - `project_members` dapat kolom `status` (`invited`\|`accepted`\|
>   `declined`) — `has_project_access()` dan semua capability helper di bawah
>   HANYA menghitung member `status='accepted'` (atau project owner)
> - `can_run_tests()` juga meng-grant role `supervisor` sejak migrasi
>   `20260728000008_supervisor_can_run_tests.sql` (semula hanya
>   `manager`/`tester`)
>
> Sisa bagian §4.1 ini akurat untuk detail yang TIDAK berubah (mis. pola
> `security definer` untuk hindari RLS recursion, split policy per-operasi).

- **Provider**: Google OAuth via Supabase Auth
  (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- **Auto-provisioning**: trigger `handle_new_user()` di `auth.users` (AFTER
  INSERT) otomatis membuat row `users` + `profiles` (V2 — dulu satu row
  `profiles` dengan `role = 'pending'`) setiap ada signup baru — tidak ada
  langkah manual untuk ini, dan tidak ada lagi status `pending` yang perlu
  di-approve
- **Role check helpers**: fungsi SQL `security definer` untuk menghindari
  RLS recursion saat query identity dari dalam policy tabel lain:
  - `is_admin()` — true jika `users.role = 'admin'` untuk `auth.uid()` saat
    ini (V2: dulu mengecek `profiles.role`)
  - `is_approved()` — true jika akun aktif (V2: dulu berarti role `user` atau
    `admin`, sekarang tidak ada lagi konsep `pending` untuk dicek)
- **Admin pertama**: TIDAK ada mekanisme otomatis (sengaja) — di-set manual via
  Supabase Table Editor
  (`update users set role = 'admin' where email = '...'`) setelah user tsb
  login sekali

**Row Level Security — sekarang project-scoped, bukan lagi role global saja:**

Skema RLS sudah dua kali reshape sejak awal:
1. `schema_auth.sql` — kebijakan `is_approved()` polos (role `user`/`admin`
   bebas CRUD semua row, `pending` diblokir total)
2. `schema_project_members.sql` + `schema_project_roles.sql` — reshape jadi
   **per-project**: akses ke data sebuah project (test plan, test case, test
   run, dst) ditentukan oleh baris `project_members` untuk `(project_id,
   auth.uid())`, bukan lagi cuma role global

- `profiles` — user hanya boleh baca profil sendiri (dan hanya jika belum
  di-soft-delete); admin boleh baca semua + update role siapa pun
- **Role global** (`profiles.role`): `pending`/`user`/`admin` — gerbang paling
  luar (pending diblokir total dari semua modul)
- **Role per-project** (`project_members.role`):
  `manager`/`supervisor`/`tester`/`member` — menentukan hak aksi *dalam* satu
  project tertentu, independen dari role global (kecuali admin, yang selalu
  punya hak penuh di semua project)
- **Helper function** (`security definer`, hindari RLS recursion):
  - `is_admin()` / `is_approved()` — role global, dipakai gerbang paling luar
  - `has_project_access(project_id)` — admin, atau user terdaftar di
    `project_members` untuk project itu (syarat minimum untuk SELECT)
  - `can_edit_project_content(project_id)` — admin, atau role
    `manager`/`supervisor`
  - `can_delete_project_content(project_id)` — admin, atau role `manager`
    (hanya manager yang boleh hapus permanen — supervisor/tester tidak)
  - `can_run_tests(project_id)` / `can_manage_issues(project_id)` — admin,
    atau role `manager`/`tester`
- Kebijakan `for all` lama sudah **di-split per-operasi** (`select`/
  `insert`/`update`/`delete` masing-masing policy sendiri) supaya tiap
  operasi bisa pakai helper function yang berbeda (mis. semua approved
  member boleh `select`, tapi cuma `manager` yang boleh `delete`)

Tabel yang RLS-nya sudah project-scoped: `projects`, `test_plans`,
`test_cases`, `test_plan_cases`, `modules`, `tags`, `test_case_tags`,
`test_runs`, `test_results`, `issues`, `issue_test_results`, `issue_tags`,
`test_case_steps`, `test_result_steps`, `attachments`.

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

### 6.3 Modul Test Run, Test Result, Issue v2 (E12/E13/E16, current)

```
TestPlanDetailPage (tab "Test Runs") → useTestRuns hook → testRunService.listByPlan/start → testRunRepository
TestRunResultDetailPage (satu halaman untuk /test-runs/:id DAN item terpilih via ?resultId=) →
  useTestRunDetail hook → testRunService.getWithResults → testResultRepository (+ join test_cases, profiles, test_result_steps)
  useIssuesByTestRun hook → issueService.listByTestRun → issueRepository (+ join issue_test_results, module, tags, assignee)
TestRunIssuesPage (/test-runs/:id/issues) → view issue yang tertaut ke run tsb, join lewat issue_test_results
```

- **Satu halaman gabungan, bukan dua** (`TestRunResultDetailPage.tsx`) —
  desain awal (list + detail sebagai halaman terpisah) diganti karena
  berpindah antar keduanya lewat route berbeda membuat React Router
  unmount/remount seluruh komponen (termasuk breadcrumb sempat kosong
  sesaat). Item terpilih sekarang jadi **query param** `?resultId=` di route
  yang sama (`/test-runs/:id`), bukan segmen path — jadi komponennya tidak
  pernah remount saat berpindah item. Layout 2 kolom, scroll independen:
  panel kiri (daftar test case + filter status/prioritas/module/tag/search,
  nomor urut, badge status), panel kanan (detail item terpilih atau summary
  progress run kalau belum ada item dipilih)
- **Navigasi Prev/Next** — tombol di atas card detail (pinned, tidak ikut
  scroll), berjalan di atas hasil `filteredResults` (urutan yang sama dilihat
  di panel kiri), bukan urutan mentah `results`
- **Sequence (E13)**: `test_plan_cases.order` menentukan urutan tampil test
  case di plan (drag & drop di `TestPlanDetailPage`), diwarisi ke
  `test_results.order` saat run dimulai (snapshot, tidak berubah retroaktif
  kalau plan di-reorder setelahnya). Sequence murni panduan — tidak ada
  validasi urutan di `recordResult`/`recordStepResult`
- **Mulai run — dua jalur**:
  1. Dialog di tab "Test Runs" pada `TestPlanDetailPage` →
     `testRunService.start(testPlanId, name)` — snapshot cakupan test case
     yang sedang ada di plan tsb → redirect ke `/test-runs/:id`
  2. **Custom/unplanned run (E16)**: dialog "Buat Test Run" di tab "Test
     Runs" pada `ProjectDetailPage` — pilih mode "Dari Test Plan" (sama
     seperti jalur 1) atau **"Unplanned / Custom"**: tanpa Test Plan sama
     sekali, user pilih Test Case satu-per-satu lewat `MultiSelect` →
     `testRunService.startCustom(projectId, name, testCaseIds)` →
     `testResultRepository.seedForRun` (fungsi yang sama, sudah plan-agnostic
     sejak awal). `test_runs.test_plan_id` bernilai `null` untuk run jenis
     ini, `test_runs.project_id` (kolom langsung, E16) tetap wajib —
     `TestRunResultDetailPage` bekerja identik untuk kedua jenis run karena
     halaman itu tidak pernah referensi `testPlan` sama sekali
- **Catat hasil**: card "Catat Hasil Eksekusi" — dropdown status (termasuk
  `not_run` = "Belum Dites", bukan cuma pass/fail/skip/blocked), dropdown
  tester, textarea catatan, tombol "Lihat Test Case Asli" (link ke live
  template kalau masih ada). Kalau test case bertipe `detailed`, tampil juga
  checklist per-step (pass/fail per baris via `testRunService.recordStepResult`)
- **Link Issue** (bukan lagi "Buat Issue" langsung dari baris FAIL): card
  "Link Issue" menampilkan daftar issue yang **sudah tertaut** ke test case
  ini + tombol "Browse Issues" → dialog paginated (DataTable) berisi semua
  issue project dengan checkbox tautkan/lepas (optimistic update, checkbox
  reflect instan tanpa nunggu round-trip) → tombol "Buat Issue" di dalam
  dialog itu buka dialog kedua (form lengkap: type/module/tag/priority/
  description) yang begitu disimpan otomatis menautkan issue baru ke test
  result yang sedang aktif
- **Kelola Issue lintas run**: `TestRunIssuesPage` (`/test-runs/:id/issues`)
  tetap ada sebagai **view** — join `issue_test_results` → `test_results`
  untuk run tsb, dropdown status & assignee inline di kolom tabel

### 6.6 Issue & Feature Tracking v2 (E12)

```
ProjectDetailPage (tab "Issues") → useIssuesByProject hook → issueService.listByProject → issueRepository (+ join module, tags, assignee, linkedTestResults)
IssueDetailPage (/issues/:id) → issueService.getById → issueRepository (+ attachments via attachmentService)
TestRunResultDetailPage (Link Issue) → issueService.listByProject (browse) atau issueService.create (buat baru, lalu linkToTestResult)
```

- **Reshape skema**: `issues.test_result_id` (FK wajib, v1) dihapus, diganti
  `issues.project_id` (wajib) + `issues.module_id` (nullable) + junction
  `issue_test_results` (N:M) + junction `issue_tags` (N:M, reuse `tags`)
- **Bukan halaman terpisah** (`pages/issues/IssuesPage.tsx` seperti rencana
  awal) — tab "Issues" sudah ada duluan di `ProjectDetailPage` sebelum E12
  dimulai (bersama `IssueDetailPage` standalone), keduanya direshape untuk
  model N:M alih-alih dibuat baru: filter langsung by `moduleId`/`tags` pada
  row issue (bukan lewat test case), tombol "Issue Baru" buka dialog create
  standalone (type/module/tag/priority), menu row punya **Arsipkan** dan
  **Hapus** sebagai dua aksi independen (bukan salah satu berdasarkan role)
- **Kolom "Ditautkan"** di tab Issues — jumlah Test Result tertaut; detail
  link per Test Result ada di `IssueDetailPage` (klik → `/test-runs/:id`)
- `issueRepository.findAllByTestResult(testResultId)` /
  `findAllByProject(projectId)` / `findAllByTestRun(testRunId)` — tiga entry
  point baca berbeda, semua join lewat `issue_test_results`
- **Attachment**: `attachmentService` di belakang `StorageAdapter` interface
  (`upload(file): Promise<UploadedFile>`, `remove(url)`) — implementasi awal
  `SupabaseStorageAdapter` (bucket private, signed URL), disiapkan slot untuk
  `InternalBackendAdapter` di masa depan tanpa mengubah pemanggil
  (`IssueDetailPage` hanya bicara ke `attachmentService`, bukan provider
  konkret)
- **Test Case Step (detailed mode)**: `test_case_steps` (template) ditampilkan
  di form Test Case (`ProjectDetailPage`, toggle `SelectButton`
  "Simple"/"Detailed") ketika `step_type = 'detailed'` — daftar step dinamis
  (tambah/hapus baris: action, expected result) menggantikan textarea. Saat
  Test Run mulai, `testResultRepository.seedForRun()` ikut men-seed
  `test_result_steps` (`not_run`) untuk tiap step dari test case `detailed`
  dalam cakupan — mirip pola seeding `test_results` yang sudah ada
- **External links**: kolom `external_links` (`jsonb` array `{url, label?}`,
  awalnya bernama `github_links`) di form Issue — input dinamis (tambah/hapus
  baris), murni teks, tidak ada validasi format atau panggilan API eksternal
  sama sekali

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
  `Test Plans`/`Test Cases`/`Modules`/`Tags`/`Test Runs`/`Issues` — pola tab
  ini meniru `Detail.vue` Customer amanah-pos yang punya beberapa tab
  riwayat. Tab aktif tersimpan di query param `?tab=` (`useTabQueryParam`)
  supaya tombol Back browser bisa berpindah antar tab
- **Data fetching (E14)**: tiap tab adalah `useQuery` React Query terpisah
  (bukan lagi cache `Map` module-level) — lihat §2.6 untuk rationale
  lengkap kenapa ini diganti

### 6.7 Test Suite Library, Import CSV, RBAC Field (E17)

> Awalnya modul ini disebut "Test Case Template Library" (halaman, route,
> service, repository, dan tabel semua bernama `*Template*`). UI-nya lalu
> di-rename ke **"Test Suite"** karena lebih jelas membedakan dari "Test
> Case" (entitas project-scoped di tab Test Cases) — "Template" dan "Test
> Case" terdengar seperti sinonim, padahal ini library global yang di-clone,
> bukan template dari satu test case. Kode (route, file, service, repository,
> domain type) dan skema tabel di-refactor mengikuti nama baru ini (migrasi
> `20260725000001_rename_test_case_templates_to_test_suites.sql`) supaya
> tidak ada drift antara label UI dan nama di kode — lihat konvensi §"Naming
> & Convention" di CLAUDE.md.

```
TestSuitesPage (/test-suites) → testSuiteService.listSuites → testSuiteRepository
TestSuiteDetailPage (/test-suites/:id) → listItems/addItem/updateItem/removeItem (+ steps kalau detailed)
ProjectsPage (dialog Project Baru) → testSuiteService.cloneItemsToProject setelah projectService.create
ProjectDetailPage (tab Test Cases) → tombol "Import dari Template" (cloneItemsToProject) & "Import dari Excel" (ExcelImportPanel → testCaseImportService.importRows)
```

- **Test Suite library bersifat global, bukan project-scoped** — satu-satunya
  tabel di codebase ini dengan bentuk RLS "semua approved user boleh SELECT,
  hanya admin boleh INSERT/UPDATE/DELETE" (`is_approved()`/`is_admin()`
  langsung, tanpa lewat `project_members`). Semua tabel lain sebelumnya
  selalu project-scoped atau "approved users, akses penuh"
- **`module_name`/`tag_names` di suite item adalah teks bebas**, bukan FK
  ke `modules`/`tags` — karena keduanya scoped per-project sementara suite
  tidak. Resolusi jadi row `Module`/`Tag` sungguhan (find-or-create, di-cache
  per panggilan supaya batch item yang share nama module cuma create sekali)
  terjadi di `testSuiteService.cloneItemsToProject()`, dipanggil baik
  dari alur "New Project from Template" maupun tombol "Import dari Template"
- **Tidak pakai `next_entity_code()`** — fungsi itu murni per-`project_id`,
  suite item tidak dapat kode entity sama sekali (suite bukan bagian
  dari skema kode `TC-####` project)
- **Import CSV (bukan Excel/`xlsx`)**: paket npm `xlsx` (SheetJS) punya
  *high-severity* vulnerability (prototype pollution + ReDoS) yang belum ada
  fix di registry npm — keputusan produk pakai CSV saja, tanpa dependency
  eksternal (`helpers/csvImport.ts`, parser RFC 4180 minimal ditulis manual).
  Excel/Google Sheets tetap bisa export/import CSV native, jadi "Import dari
  Excel" di UI tetap berfungsi end-to-end, hanya user perlu save-as CSV dulu.
  Kolom Module/Title/Objective/Preconditions/Steps/Expected Result/Priority/
  Tags/Target Role, hanya Title wajib. Dialog preview baris valid vs invalid
  (dengan alasan gagal) sebelum commit, bukan insert langsung buta
- **Import CSV — dukungan `step_type = 'detailed'` (multi-step)**: kolom
  Steps dobel fungsi sebagai carrier detailed-step. Kalau cell mengandung
  karakter `|`, baris di-parse sebagai `detailed`: pisah per-step dengan `;`,
  lalu tiap segmen dipisah `action | expected result` (`ordinal "N."` di
  depan segmen opsional, dibuang kalau ada). Kalau cell TIDAK mengandung `|`
  sama sekali, tetap `simple` (teks bebas) — backward compatible dengan
  format lama, tidak ada kolom header baru. Baris yang mengandung `|` tapi
  tidak menghasilkan action valid ditandai invalid ("Steps contains \\| but
  no valid action found"). Diterapkan di dua jalur import yang keduanya
  memakai parser sama (`helpers/csvImport.ts` `parseStepsCell`): Test Case
  import di `ExcelImportPanel.tsx`/`testCaseImportService.ts` (insert ke
  `test_case_steps` via `testCaseStepRepository.createMany` per test case
  setelah batch-insert test case-nya) dan Test Suite item import di
  `TestSuiteDetailPage.tsx` (`testSuiteService.addItemsMany` yang sudah
  menerima `detailedSteps` sejak awal — hanya jalur CSV yang tadinya
  hardcode `stepType: 'simple'`)
- **RBAC test case field (`test_cases.target_role_id`)**: awalnya teks bebas
  (`target_role`), sejak migrasi `20260723000002_test_roles.sql` jadi FK ke
  tabel master `test_roles` per project (pola sama seperti `modules`) — masih
  bukan enum aplikasi-lebar, karena role aplikasi yang ditest bervariasi per
  project, dan TIDAK sama dengan `project_members.role` (role internal
  Testify). Test case yang konsep-nya sama tapi perlu diuji ulang per role
  (mis. "Buka Settings" untuk Admin vs Member) di-duplikasi **manual** oleh
  user sebagai row terpisah; field ini murni label/filter, bukan sistem
  varian otomatis — keputusan eksplisit user untuk menghindari kompleksitas
  sistem custom-fields generik ala GitHub Projects

### 6.8 Project Membership (Invite/Accept) & Notifications (V2 Phase 4)

> Detail lengkap rationale & migration trail ada di `docs/ARCHITECTURE_V2.md`
> §1/§6/§7 dan `docs/ROADMAP_V2.md` Phase 4. Bagian ini merangkum bentuk
> akhirnya untuk kebutuhan sehari-hari mengembangkan modul ini.

```
ProjectSettingsPage (tab Members) → UsernamePicker (search) → projectMemberService.invite() → project_members (status='invited') + notification
HomePage ("Pending Invitations" card) / AppTopbar (bell) → useProjectInvitations / useNotifications → respond_to_project_invitation RPC
```

- **`project_members.status`**: `invited` → `accepted`/`declined`. Hanya
  member `accepted` (atau project owner) yang dihitung `has_project_access()`
  dan seluruh capability helper — invited user belum punya akses apa pun ke
  data project selain baca nama project itu sendiri (lihat migrasi #22 di
  §4)
- **Kenapa lewat RPC `security definer`, bukan RLS table select biasa**:
  seorang invited user (belum accept) tidak punya akses RLS ke `projects`
  atau `profiles` lewat jalur normal, sehingga resolusi nama project/inviter
  untuk kartu undangan tidak bisa mengandalkan join biasa. Ditangani dua
  fungsi: `list_own_pending_invitations()` (resolve nama project + inviter
  dalam satu panggilan, bypass RLS) dan `respond_to_project_invitation()`
  (accept/decline)
- **Notifications** (`notifications` table, migrasi #24): dibuat
  **client-side** dari `projectMemberService` (`invite`/`reinvite`/`remove`)
  lewat RPC `create_notification()` — **bukan trigger database**. Baru dua
  tipe yang ada: `project_invite` dan `project_member_removed`; tidak ada
  notifikasi untuk test run/issue/dll saat ini. UI: bell + unread badge di
  `AppTopbar.tsx`, `NotificationPanel.tsx` (PrimeReact `Sidebar` slide-out) —
  di-refresh via polling 30 detik (`useNotifications`'s `refetchInterval`),
  bukan realtime push (meski tabel `notifications` ada di publikasi
  Realtime, belum ada subscriber dedicated di frontend untuk itu)
- **`useProjectAccessGuard.ts`**: BUKAN gate visibility — ini guard "kamu
  baru saja kehilangan akses sambil sedang membuka halaman project ini"
  (mis. manager me-remove kamu di tengah sesi). Watch `useProjectRole`, kalau
  role hilang → redirect ke `/`. Bergantung pada `useRealtimeSync`
  meng-invalidate cache `['projectRole', projectId, userId]` saat
  `project_members` berubah
- **Project `visibility`** (`private`\|`unlisted`\|`public`, kolom di
  `projects`): diatur dari tab **Danger Zone** di `ProjectSettingsPage.tsx`.
  Public/unlisted project bisa dibaca tanpa membership; private tetap wajib
  `has_project_access()`. Belum ada UI browse/discover project public — hanya
  kontrol visibility itu sendiri (lihat ARCHITECTURE_V2 §9 kenapa showcase
  publik sengaja tidak dibangun)

### 6.9 Settings (Identity Publik) & Duplicate Project

- **`pages/settings/SettingsPage.tsx`** + **`hooks/useSettings.ts`**: user
  edit `username` (unique, **sekali seumur hidup** — trigger DB
  `check_username_change` menolak percobaan kedua), `displayName`,
  `avatarUrl`, `bio`, plus toggle tema (`useThemeContext`). Lewat
  `profileRepository`/`profileService` — jalur yang sama dengan identity
  publik lainnya (bukan `userRepository`/`userService`, yang untuk
  email/role admin-only)
- **`/@:username`** (`PublicProfilePage`, V2 Phase 6/7): lookup identitas
  (display name, avatar, bio) lewat `components/profile/ProfileView.tsx`
  (reusable — dipakai juga oleh `UserDetailPage` untuk admin). **Update Phase
  7**: halaman ini sekarang juga menampilkan daftar Project dan Test Suite
  milik user tsb yang `visibility` `public`/`unlisted` (lewat
  `projectService.listByOwner`/`testSuiteService.listByOwner`, resolve query
  `findByOwner` di masing-masing repository) — bukan lagi identitas polos
  tanpa daftar. Kalau `isOwnProfile`, filter visibility dilewati (lihat semua
  milik sendiri termasuk `private`). Admin yang membuka profil user lain
  dapat flag `isSpying` (ditampilkan di `ProfileView`) supaya jelas ini mode
  admin-lihat-punya-orang-lain, bukan spoofing. Tetap berguna sebagai target
  invite-by-username dan verifikasi kepemilikan project — belum berubah
  menjadi social feed (tidak ada follow/like/comment)
- **Delete & Reactivate Account** (`SettingsPage.tsx` Danger Zone →
  `userService.deleteAccount()`/RPC `delete_account()`): hapus permanen
  (bukan soft-delete) semua `projects` dan `test_suites` milik user
  (cascade ke isinya), hapus `notifications` dan `project_members` miliknya,
  null-kan kontribusi ke project/suite ORANG LAIN (`test_results.tester_id`,
  `issues.assigned_to`), lalu **anonymize** row `users`/`profiles` (username
  → `deleted_<unix_ts>`, email → `deleted_<unix_ts>@deleted.local`,
  `users.deleted_at = now()`) — bukan hard-delete row `users`/`profiles`
  supaya FK history (mis. `test_results.tester_id` yang di-null-kan) tetap
  konsisten dan re-signup dengan email sama tidak kebentur unique constraint.
  Kalau user yang sudah "delete" login lagi via Google dengan email sama,
  `useAuth.tsx` mendeteksi `deleted_at` terisi dan memanggil RPC
  `reactivate_account()` (security definer) yang restore `users`/`profiles`
  dengan identitas fresh (email/nama/avatar dari session Google saat itu,
  username baru di-generate dari local-part email, `role` balik ke `user`)
  — bukan mengembalikan data lama (project/suite lama sudah terhapus
  permanen saat delete). Lihat migrasi
  `20260729000003_fix_soft_delete_security.sql` (gate `is_approved()` di
  `has_project_access()` — sebelumnya soft-delete tidak benar-benar memblokir
  akses), `20260729000004_delete_account_rpc.sql`,
  `20260729000005_reactivate_account_rpc.sql`,
  `20260729000006_fix_delete_account_username_trigger.sql` (bypass trigger
  `check_username_change` supaya anonymize/reactivate boleh ganti username
  meski sudah pernah diganti sekali)
- **`services/projectDuplicateService.ts`**: clone sebagian struktur project
  (Test Plan/Test Case/Issue terpilih user) ke project baru. **Test
  Run/Test Result (riwayat eksekusi) tidak pernah ikut ter-copy** — hanya
  struktur/template, bukan histori. Memilih sebuah Test Plan otomatis
  meng-union test case-nya sendiri ke seleksi (supaya plan yang di-duplicate
  tidak berakhir dengan cakupan kosong). Batch insert (bukan loop per-row)
  untuk module/role/test case/step/plan-case/issue — 7 round-trip alih-alih
  N, tapi tetap sequential ANTAR tahap (bukan `Promise.all` antar tahap)
  supaya id-remapping antar entity benar dan find-or-create module/tag
  tidak race

---

## 7. Architectural Risks & Notes

| Risiko                                                      | Keterangan                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tidak ada test suite                                        | Belum ada Vitest/Testing Library — tambahkan jika project ini berkembang lebih jauh                                                                                                                                                                                                                                                                                  |
| PrimeReact v11 belum dipakai                                | Perlu revisit saat versi stable-nya rilis dengan sistem tema yang jelas                                                                                                                                                                                                                                                                                              |
| Bundle size                                                 | Build menghasilkan chunk >1MB (belum code-split) — cukup untuk skala aplikasi internal ini, revisit kalau modul terus bertambah                                                                                                                                                                                                                                      |
| Admin pertama manual                                        | Tidak ada seed/CLI untuk assign admin pertama — harus lewat Supabase Table Editor. Didokumentasikan, bukan bug                                                                                                                                                                                                                                                       |
| Google OAuth redirect                                       | `redirectTo: window.location.origin` — pastikan URL ini terdaftar di Supabase Auth settings (Site URL & Redirect URLs) dan Google Cloud Console OAuth client, terutama saat deploy ke domain lain dari localhost                                                                                                                                                     |
| Backend Go (`backend/`) — PENDING/paused, jauh lebih lengkap dari sekadar rencana | Bukan sekadar folder kosong: domain/repository (dual MySQL+Postgres)/service/transport HTTP layer sudah lengkap dan mem-porting business rule frontend 1:1 (lihat header comment `internal/service/testrun/service.go`). Sengaja di-pause sampai Platform Evolution V2 selesai (lihat `backend/README.md`, `docs/ARCHITECTURE_V2.md` §8). Repository layer frontend sengaja jadi satu-satunya titik yang tahu tentang Supabase supaya migrasi nanti tinggal ganti implementasi repository tanpa menyentuh service/hook/component. RLS Supabase perlu direplikasi manual jadi authorization check di sisi Go saat migrasi terjadi — tidak otomatis ikut pindah |
| Tiga build statis independen, tanpa workspace root | `landing/` (statis, tanpa build step), `frontend/` (Vite), `public-docs/` (Astro Starlight) masing-masing punya toolchain sendiri, tidak ada root `package.json`/workspaces. Disatukan hanya saat deploy (`deploy/deploy-vps.sh` — rsync + symlink swap ke satu release dir: `/`, `/app`, `/docs`). Root `README.md` sempat tidak menyebut `public-docs/` sama sekali di struktur repo — perbaiki kalau menemukan drift serupa lagi |
| Tag junction full-replace                                   | `tagService.saveTagsForTestCase` selalu delete+insert ulang seluruh `test_case_tags` untuk test case tsb saat disimpan — sederhana tapi berarti setiap save test case menyentuh baris junction meski tag tidak berubah. Cukup untuk skala saat ini (jumlah tag per test case kecil)                                                                                  |
| Storage adapter (E12) pola baru di codebase                  | Interface + implementasi terpisah (`StorageAdapter`) belum ada contohnya di layer lain (Repository saat ini langsung bicara ke Supabase, bukan lewat interface) — jadi validasi pertama pola "swappable provider" di luar rencana migrasi backend PHP                                                                                                                |
| Realtime invalidation pakai prefix luas untuk sebagian tabel (E14) | `test_runs` dan `test_plan_cases` tidak punya `project_id` di payload Realtime (cuma `test_plan_id`), jadi event tabel itu invalidate prefix `['testRuns']` penuh (semua varian `testRunsByProject`/`testRunsByPlan` yang sedang ter-cache), bukan key spesifik — sedikit overfetch tapi menghindari query lookup tambahan di jalur event handler. Keputusan produk, bukan bug |
| Dua channel Realtime terpisah untuk `profiles`                | `useAuth.tsx` subscribe channel `profile-role-${userId}` (filter row sendiri, untuk reload profil pribadi) dan `useRealtimeSync` subscribe channel `app-realtime-sync` (semua row, untuk invalidate `queryKeys.profiles()` dipakai halaman admin) — dua channel berbeda tujuan, sengaja tidak dikonsolidasi karena scope-nya beda (auth state individual vs cache list global)                                                                                                            |
