# TASKS — TestManager (shiftech-test-mgr)

Hierarchical work breakdown (Epic → Feature → Task). Rujuk ID task ini saat
membuat perubahan atau mengambil item dari [`TODO.md`](../TODO.md).

Status: `done` · `in-progress` · `todo` · `blocked`

---

## E01 — Fondasi Arsitektur

| ID      | Task                                                                            | Status |
| ------- | ------------------------------------------------------------------------------- | ------ |
| E01-T01 | Scaffold Vite + React + TS                                                      | done   |
| E01-T02 | Install & konfigurasi PrimeReact 10 + PrimeFlex + PrimeIcons                    | done   |
| E01-T03 | Setup Supabase client (`config/supabaseClient.ts`) + `.env.example`             | done   |
| E01-T04 | Definisikan domain types (`types/domain.ts`)                                    | done   |
| E01-T05 | Buat schema SQL (`supabase/schema.sql`) + seed                                  | done   |
| E01-T06 | Buat mapper row↔domain (`helpers/mappers.ts`)                                   | done   |
| E01-T07 | Setup routing (`react-router-dom`) + layout shell (Menubar)                     | done   |
| E01-T08 | Dokumentasi: CLAUDE.md, AGENTS.md, README.md, docs/PRD.md, docs/ARCHITECTURE.md | done   |

## E02 — Modul Projects

| ID      | Task                                                                    | Status |
| ------- | ----------------------------------------------------------------------- | ------ |
| E02-T01 | Repository `projectRepository` (findAll, create)                        | done   |
| E02-T02 | Service `projectService` (validasi nama)                                | done   |
| E02-T03 | Halaman `ProjectsPage` (list + create dialog)                           | done   |
| E02-T04 | Edit & delete project                                                   | todo   |
| E02-T05 | Project selector/context global (dipakai TestPlansPage & TestCasesPage) | todo   |

## E03 — Modul Test Cases

| ID      | Task                                                                                                                  | Status |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| E03-T01 | Repository `testCaseRepository` (CRUD + `findAllByProjectWithDetails` join module/tags)                               | done   |
| E03-T02 | Service `testCaseService` (validasi title/steps/expected, archive/reactivate, tag saving)                             | done   |
| E03-T03 | Halaman `TestCasesPage` (list lintas project via dropdown, read-only — CRUD ada di tab Project Detail)                | done   |
| E03-T04 | Form create/edit test case (Dialog) — Module, Objective, Preconditions, Steps, Expected Result, Priority, Tags, Notes | done   |
| E03-T05 | Delete test case + konfirmasi                                                                                         | done   |
| E03-T06 | Filter by priority/status                                                                                             | todo   |

## E04 — Modul Test Plans

| ID      | Task                                                                                                                           | Status     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| E04-T01 | Repository `testPlanRepository` (CRUD)                                                                                         | done       |
| E04-T02 | Service `testPlanService` (create/rename/status, `listCases` — TANPA summary, lihat E08)                                       | done       |
| E04-T03 | Hook `useTestPlans`, `useTestPlanDetail`                                                                                       | done       |
| E04-T04 | Halaman `TestPlansPage` (list + navigasi ke detail)                                                                            | done       |
| E04-T05 | Halaman `TestPlanDetailPage`: tab Test Cases (cakupan plan) + tab Test Runs                                                    | done       |
| E04-T06 | Form create test plan (Dialog)                                                                                                 | done       |
| E04-T07 | UI tambah/keluarkan test case ke plan (MultiSelect dari test case pool project)                                                | done       |
| E04-T08 | ~~UI catat hasil eksekusi per test case~~ — **dipindah ke Test Run** (lihat E08), Test Plan sendiri tidak lagi menyimpan hasil | superseded |

## E07 — Project Lifecycle (search, filter, sort, status, hapus permanen, detail)

| ID      | Task                                                                                                                 | Status |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| E07-T01 | Schema: `projects.status` + index status/name (`supabase/schema_project_lifecycle.sql`)                              | done   |
| E07-T02 | Repository `projectRepository`: `findAll(query)` dengan search/filter/sort, `updateStatus`, `deletePermanently`      | done   |
| E07-T03 | Service `projectService`: `update`, `changeStatus`, `deletePermanently`                                              | done   |
| E07-T04 | Hook `useProjects(query)`                                                                                            | done   |
| E07-T05 | `ProjectsPage`: search bar, dropdown filter status, kolom sortable, menu aksi per baris (edit/status/hapus permanen) | done   |
| E07-T06 | `ProjectDetailPage`: info project + tab Test Plans/Test Cases + hapus permanen                                       | done   |
| E07-T07 | Route `/projects/:id`                                                                                                | done   |

## E05 — Polish (opsional, sesuai kebutuhan validasi arsitektur)

| ID      | Task                                     | Status |
| ------- | ---------------------------------------- | ------ |
| E05-T01 | Toast notification global (sukses/error) | todo   |
| E05-T02 | Loading skeleton konsisten               | todo   |
| E05-T04 | Vitest + Testing Library setup           | todo   |

## E06 — Auth & RBAC (Google Login + User Management)

| ID      | Task                                                                                                                 | Status                            |
| ------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| E06-T01 | Schema `profiles` + trigger auto-create on signup (`supabase/schema_auth.sql`)                                       | done                              |
| E06-T02 | RLS berbasis role (`is_admin()`, `is_approved()`) di semua tabel domain + `profiles`                                 | done                              |
| E06-T03 | Domain type `Profile`, `UserRole` + mapper                                                                           | done                              |
| E06-T04 | Repository & service `profileRepository`/`profileService` (getOwnProfile, listAll, approve, reject, promote, demote) | done                              |
| E06-T05 | `AuthProvider` (`hooks/useAuth.tsx`) — session + profile + role state, `signInWithGoogle`, `signOut`                 | done                              |
| E06-T06 | Halaman `LoginPage` (tombol Sign in with Google)                                                                     | done                              |
| E06-T07 | Halaman `PendingApprovalPage`                                                                                        | done                              |
| E06-T08 | Route guard `ProtectedRoute` (redirect login/pending) & `AdminRoute`                                                 | done                              |
| E06-T09 | Halaman `UserManagementPage` (list user, approve, promote/demote)                                                    | done                              |
| E06-T10 | Update `AppLayout` — avatar, nama user, tombol logout, menu User Management khusus admin                             | done                              |
| E06-T11 | Konfigurasi Google OAuth provider di Supabase Dashboard (Client ID/Secret dari Google Cloud Console)                 | done (dikonfirmasi user)          |
| E06-T12 | Set admin pertama manual via Supabase Table Editor setelah login pertama kali                                        | done (dikonfirmasi user)          |
| E06-T13 | Halaman reject eksplisit / status "rejected" terpisah dari "pending" (jika diperlukan)                               | todo — lihat open question di PRD |
| E06-T14 | Schema: `profiles.deleted_at` (soft delete) + RLS diperbarui (`supabase/schema_project_lifecycle.sql`)               | done                              |
| E06-T15 | Repository/service: `softDelete`/`remove`, `revokeAccess`, `getById`                                                 | done                              |
| E06-T16 | Halaman `UserDetailPage` (`/users/:id`)                                                                              | done                              |
| E06-T17 | `UserManagementPage`: tombol Detail, Cabut Akses, Hapus + `ConfirmDialog`/`Toast`                                    | done                              |

## E08 — Test Management v2 (Module, Tag, Test Run, Test Result, Issue)

Reshape besar mengikuti konsep produk: pisahkan template (Test Case) dari
riwayat eksekusi (Test Run/Result). Lihat `docs/PRD.md` §3 dan
`docs/ARCHITECTURE.md` §4.0 untuk rationale lengkap.

| ID      | Task                                                                                                                                                                                                                    | Status |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E08-T01 | Schema `schema_test_management_v2.sql`: modules, tags, test_case_tags, test_runs, test_results, issues; reshape test_cases (+module_id, objective, notes, status active/archived) & test_plan_cases (hapus kolom hasil) | done   |
| E08-T02 | Domain types baru: `Module`, `Tag`, `TestRun`, `TestResult`, `Issue` + update `TestCase`/`TestPlanCase`                                                                                                                 | done   |
| E08-T03 | Mapper untuk semua entity baru                                                                                                                                                                                          | done   |
| E08-T04 | Repository/service Module (`moduleRepository`/`moduleService`/`useModules`)                                                                                                                                             | done   |
| E08-T05 | Repository/service Tag dengan creatable resolution (`tagRepository.findOrCreate`, `tagService.saveTagsForTestCase`)                                                                                                     | done   |
| E08-T06 | Repository/service Test Run (`testRunService.start` seeds test_results, `complete`/`reopen` manual, `getWithResults` summary otomatis)                                                                                  | done   |
| E08-T07 | Repository/service Test Result (`recordResult`)                                                                                                                                                                         | done   |
| E08-T08 | Repository/service Issue (1:many terhadap Test Result, `listByTestRun` join test_results)                                                                                                                               | done   |
| E08-T09 | `ProjectDetailPage`: tab Modules (CRUD) + tab Test Cases lengkap (dialog Module/Tag/Objective/Notes)                                                                                                                    | done   |
| E08-T10 | `TestPlanDetailPage`: hapus progress lama, tab Test Cases (add/remove cakupan) + tab Test Runs (mulai run, riwayat)                                                                                                     | done   |
| E08-T11 | `TestRunDetailPage`: summary otomatis, catat hasil per test case (status/tester/notes), tombol selesaikan/buka kembali run                                                                                              | done   |
| E08-T12 | `TestRunIssuesPage`: list issue per run, ubah status & assignee inline                                                                                                                                                  | done   |
| E08-T13 | Routing `/test-runs/:id`, `/test-runs/:id/issues`                                                                                                                                                                       | done   |
| E08-T14 | Halaman reject eksplisit / status "rejected" terpisah (jika diperlukan)                                                                                                                                                 | todo   |
| E08-T15 | Attachment Issue (jika diperlukan — link URL atau upload file, lihat open question PRD)                                                                                                                                 | todo   |

## E09 — Restrukturisasi Monorepo (frontend/ + backend/)

| ID      | Task                                                                                                                     | Status                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| E09-T01 | Pindahkan aplikasi React ke `frontend/` (package.json, node_modules, vite.config, tsconfig, index.html, public, .env)    | done (oleh user)         |
| E09-T02 | Pindahkan `src/` ke `frontend/src/`                                                                                      | done                     |
| E09-T03 | Siapkan folder `backend/` untuk migrasi PHP + SQLite masa depan                                                          | done (kosong, disiapkan) |
| E09-T04 | Migrasi repository layer ke backend PHP (mengganti isi `repositories/*.ts` dari Supabase call ke `fetch()` endpoint PHP) | todo — belum prioritas   |

## E10 — Kode Entity Auto-Generate (Module, Test Case, Test Plan, Test Run)

Default otomatis (`MOD-0001`, `TC-0001`, `TP-0001`, `TR-0001`, per project per
jenis entity), selalu bisa diedit user.

| ID      | Task                                                                                                                                                                                                                     | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| E10-T01 | Schema `schema_entity_codes.sql`: tabel `entity_code_sequences`, fungsi `next_entity_code()`, trigger `before insert` di modules/test_cases/test_plans/test_runs, backfill kode untuk row lama, unique index per project | done   |
| E10-T02 | Domain types: tambah field `code` di `Module`/`TestCase`/`TestPlan`/`TestRun`                                                                                                                                            | done   |
| E10-T03 | Mapper: map kolom `code` untuk keempat entity                                                                                                                                                                            | done   |
| E10-T04 | Repository/service: `create()` terima `code` opsional (kosong → trigger DB isi otomatis), `update()` terima `code` untuk override manual                                                                                 | done   |
| E10-T05 | UI: kolom "Kode" di semua tabel (Modules, Test Cases, Test Plans, Test Runs) + field "Kode" (placeholder "Otomatis jika dikosongkan") di dialog create/edit Module, Test Case, Test Plan                                 | done   |
| E10-T06 | Judul halaman detail (`TestPlanDetailPage`, `TestRunDetailPage`) menampilkan kode                                                                                                                                        | done   |

## E11 — Perbaikan Gap (audit menyeluruh setelah E08)

Ditemukan saat audit: Tag dan Test Run sudah punya backend lengkap (E08) tapi
UI-nya belum sepenuhnya terhubung/terlihat.

| ID      | Task                                                                                                                                                             | Status |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E11-T01 | Repository/service Tag: tambah `update`(rename)/`remove` (sebelumnya hanya `findOrCreate`)                                                                       | done   |
| E11-T02 | Tab "Tags" di `ProjectDetailPage`: list, rename (dialog), hapus — melengkapi Tag yang sebelumnya cuma bisa dibuat on-the-fly tanpa cara melihat/mengelola daftar | done   |
| E11-T03 | Repository `testRunRepository.findAllByProject` — join test_runs ke test_plans untuk listing lintas plan dalam satu project                                      | done   |
| E11-T04 | Halaman `TestRunsPage` (`/test-runs`) — daftar Test Run lintas project, pola sama seperti `TestCasesPage`/`TestPlansPage`                                        | done   |
| E11-T05 | Tambah item "Test Runs" ke `AppMenu` (sidebar) — sebelumnya tidak ada entri navigasi ke Test Run kecuali lewat Test Plan Detail                                  | done   |

## E12 — Issue & Feature Tracking v2, Structured Test Case Steps, Attachment Adapter

Reshape Issue jadi entity level-project dengan relasi N:M ke Test Result
(bukan lagi anak wajib satu Test Result), tambah mode step detail per Test
Case, dan siapkan storage adapter untuk attachment. Lihat `docs/PRD.md` §3
(Issue, Test Case, Attachment) dan `docs/ARCHITECTURE.md` §4 tabel skema +
§6.6 untuk rationale lengkap. Reporting (dashboard/PDF/HTML) **sengaja
di-skip** di epic ini — lihat `docs/PRD.md` §7.

### E12.1 — Schema

| ID       | Task                                                                                                                                                                                                                                                             | Status |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| E12-T01  | `supabase/schema_issue_tracking_v2.sql` — tambah `issues.project_id` (FK, not null, backfill dari `test_result_id` lewat join `test_results→test_runs→test_plans` untuk row lama), `issues.module_id` (FK nullable), `issues.type` (check `bug\|feature\|improvement\|task`, default `bug`), `issues.github_links` (`jsonb` default `'[]'`)                | done   |
| E12-T02  | Migrasi data: insert 1 baris `issue_test_results` per row `issues` lama (dari `test_result_id` sebelum dihapus) — jalan sebagai bagian script yang sama sebelum drop kolom                                                                                    | done   |
| E12-T03  | Tabel baru `issue_test_results` (issue_id, test_result_id, unique pair) — junction N:M, `on delete cascade` kedua sisi                                                                                                                                          | done   |
| E12-T04  | Tabel baru `issue_tags` (issue_id, tag_id, unique pair) — junction N:M reuse `tags`, `on delete cascade`                                                                                                                                                        | done   |
| E12-T05  | Drop kolom `issues.test_result_id` (setelah T02 selesai) + drop index lama `idx_issues_test_result`, tambah index `idx_issues_project`, `idx_issues_module`, `idx_issues_type`                                                                                 | done   |
| E12-T06  | RLS: policy `issue_test_results`/`issue_tags` — **disesuaikan**: codebase sudah migrasi RLS ke akses per-project (`has_project_access`/`can_manage_issues`/`can_delete_project_content`, lihat `schema_project_roles.sql`) sebelum E12 dikerjakan, bukan `is_approved()` polos seperti rencana awal | done   |
| E12-T07  | `supabase/schema_test_case_steps.sql` — `test_cases.step_type` (check `simple\|detailed`, default `simple`); tabel `test_case_steps` (test_case_id, step_number, action, expected_result, unique `(test_case_id, step_number)`)                                | done   |
| E12-T08  | Tabel `test_result_steps` (test_result_id, test_case_step_id, status check `pass\|fail\|not_run`, actual_result, unique pair) + RLS pola project-scoped (`can_run_tests`/`has_project_access`/`can_delete_project_content`)                                    | done   |
| E12-T09  | `supabase/schema_attachments.sql` — tabel `attachments` (issue_id FK cascade, storage_provider text, url text, file_name, file_size, content_type, timestamps) + RLS pola project-scoped (`has_project_access`/`can_manage_issues`)                            | done   |
| E12-T10  | Supabase Storage: bucket `attachments` dibuat **private** — akses baca lewat signed URL dari adapter, bukan public read; storage policy upload/read/delete untuk `is_approved()` (storage.objects tidak simpan project_id, jadi tetap level aplikasi bukan per-project) | done   |

### E12.2 — Domain Types & Mapper

| ID       | Task                                                                                                                                                                                          | Status |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E12-T11  | `types/domain.ts`: reshape `Issue` (`projectId`, `moduleId?`, `type: IssueType`, `githubLinks: GithubLink[]`, hapus `testResultId`), tambah `IssueType`, `GithubLink { url, label? }`; `IssueWithDetails` ganti `testCase`/`testRun` tunggal jadi `linkedTestResults[]` (N:M) + `module`/`tags` langsung | done   |
| E12-T12  | `types/domain.ts`: tambah `TestCaseStep`, `TestResultStep`, `TestResultStepWithDetails`, `Attachment`; update `TestCase` (+`stepType: 'simple' \| 'detailed'`), `TestResultWithDetails` (+`stepResults[]`)     | done   |
| E12-T13  | `helpers/mappers.ts`: mapper untuk `Issue` (reshape), `TestCaseStep`, `TestResultStep`, `Attachment`, `GithubLink` (jsonb parse/serialize)                                                       | done   |

### E12.3 — Repository & Service

| ID       | Task                                                                                                                                                                                                              | Status |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| E12-T14  | `issueRepository`: reshape query dasar (`findAllByProject`, `findById` join module/tags/linked test results), hapus asumsi FK `test_result_id` lama                                                                | done   |
| E12-T15  | `issueRepository`: `findAllByTestResult(testResultId)` & `findAllByProject(projectId)` — dua entry point baca via join `issue_test_results`                                                                      | done   |
| E12-T16  | `issueRepository`/`issueService`: `linkToTestResult(issueId, testResultId)`, `unlinkFromTestResult(issueId, testResultId)` — upsert/delete `issue_test_results`                                                  | done   |
| E12-T17  | `issueService`: validasi create/update (title wajib), `tagService.saveTagsForIssue` (pola sama seperti `saveTagsForTestCase` — full replace `issue_tags`)                                                          | done   |
| E12-T18  | `testCaseStepRepository`/`testCaseStepService`: full-replace step per test case (dipanggil hanya saat `stepType === 'detailed'`, mengikuti pola full-replace tag junction, bukan CRUD granular per step)          | done   |
| E12-T19  | `testResultRepository.seedForRun()`: update agar ikut men-seed `test_result_steps` (`not_run`) untuk tiap `test_case_steps` dari test case `detailed` dalam cakupan plan — mirror pola seeding `test_results`     | done   |
| E12-T20  | `testRunService.recordStepResult(testResultStepId, status, actualResult)` — mirror `recordResult`                                                                                                                 | done   |
| E12-T21  | `services/storage/StorageAdapter.ts` — interface `{ providerName, upload(file: File): Promise<UploadedFile>, remove(url): Promise<void> }`                                                                        | done   |
| E12-T22  | `services/storage/SupabaseStorageAdapter.ts` — implementasi pakai `supabase.storage.from('attachments')` (bucket private, signed URL), di-export sebagai adapter default aktif lewat `services/storage/index.ts` | done   |
| E12-T23  | `attachmentService.ts` (di atas `issueRepository` attachment methods): CRUD row `attachments`, `upload(issueId, file)` orkestrasi panggil adapter aktif lalu simpan row DB                                        | done   |

### E12.4 — Hooks & UI

| ID       | Task                                                                                                                                                                                                   | Status |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E12-T24  | `hooks/useIssues.ts` (`useIssuesByProject`, `useIssuesByTestRun`) — signature dipertahankan, isi disesuaikan ke shape `IssueWithDetails` baru (module/tags/linkedTestResults)                            | done   |
| E12-T25  | **Disesuaikan**: bukan halaman baru `pages/issues/IssuesPage.tsx` — tab "Issues" sudah ada duluan di `ProjectDetailPage` (sebelum E12 dimulai) beserta `IssueDetailPage` standalone; keduanya direshape untuk model N:M (filter by `moduleId`/`tags` langsung, tombol "Issue Baru" dialog create standalone dgn type/module/tag) | done   |
| E12-T26  | Kolom "Ditautkan" di tab Issues `ProjectDetailPage` — jumlah Test Result tertaut; detail link per Test Result ada di `IssueDetailPage` (klik → `/test-runs/:id`)                                        | done   |
| E12-T27  | `TestRunDetailPage`: tombol bendera "Link Issue" muncul di semua baris (bukan hanya FAIL) — dialog `TabView` dua mode: "Pilih Existing" (checkbox list issue project) / "Buat Baru" (form ringkas, auto-link setelah create)  | done   |
| E12-T28  | `TestRunDetailPage`: badge jumlah issue tertaut per baris Test Result via `issueCountByResult` dari `issue.linkedTestResults`, dialog Link Issue prefill checkbox issue yang sudah tertaut               | done   |
| E12-T29  | `TestRunIssuesPage` (`/test-runs/:id/issues`): filter `testResultId` disesuaikan ke `issue.linkedTestResults.some(...)` — sudah sebelumnya lewat `issueRepository.findAllByTestRun` (join `issue_test_results`), bukan FK langsung | done   |
| E12-T30  | Form Test Case di `ProjectDetailPage`: `SelectButton` toggle "Simple / Detailed" (`stepType`) — simple = textarea Steps seperti sekarang, detailed = daftar step dinamis (tambah/hapus baris: action, expected result) menggantikan textarea, di-load via `testCaseService.listSteps` saat edit | done   |
| E12-T31  | `TestRunDetailPage`: dialog "Catat Hasil Eksekusi" menampilkan checklist per step (`activeResult.stepResults`, dropdown pass/fail per baris via `testRunService.recordStepResult`) kalau test case `detailed`, kosong (`[]`) untuk `simple`                | done   |
| E12-T32  | `IssueDetailPage`: card Attachment dengan `FileUpload` (PrimeReact, mode basic) → `attachmentService.upload` → list attachment (link + tombol hapus lewat `attachmentService.remove`)                    | done   |
| E12-T33  | **Tidak diperlukan** — Issues tetap sebagai tab di `ProjectDetailPage` (bukan halaman lintas-project terpisah), jadi tidak perlu entri menu sidebar baru; konsisten dengan pola Modules/Tags yang sudah ada | done   |

## E13 — Halaman Detail Test Case dalam Test Run + Sequence pada Test Plan

Reshape dialog "Detail Test Case" di `TestRunDetailPage` jadi halaman tersendiri
dengan panel navigasi + filter (menggantikan dialog yang saling menutup satu
sama lain), dan tambah dukungan urutan eksekusi (sequence) di Test Plan tanpa
entity Test Suite baru — lihat `docs/PRD.md` §4.4 dan `docs/ARCHITECTURE.md`
§4.0 untuk rationale.

| ID      | Task                                                                                                                                                                          | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| E13-T01 | Halaman baru `pages/test-runs/TestRunResultDetailPage.tsx`, awalnya route terpisah `/test-runs/:runId/results/:resultId` — layout 2 kolom: panel kiri daftar test case + filter (status/prioritas/module/tag/search), panel kanan detail + record hasil + step checklist + link issue (semua inline, bukan dialog). **Digabung dengan `TestRunDetailPage` di E14** setelah ditemukan bug breadcrumb — lihat E14-T01 | done (di-superseded sebagian, lihat E14) |
| E13-T02 | `TestRunDetailPage` (list) sempat disederhanakan jadi halaman terpisah dari detail. **Dihapus total di E14** — digabung jadi satu komponen dengan `TestRunResultDetailPage` | superseded, lihat E14-T01 |
| E13-T03 | `testResultRepository.findAllByRun`: join `test_case.module`/`test_case.test_case_tags` supaya filter module/tag bisa jalan tanpa query tambahan; `TestResultWithDetails.testCase` tipenya jadi `TestCaseWithDetails \| null` | done   |
| E13-T04 | `supabase/schema_test_run_order.sql` (migration `20260701000014`) — tambah `test_results.order` (snapshot `test_plan_cases.order` saat run dimulai), backfill row lama, index `(test_run_id, order)` | done   |
| E13-T05 | `testResultRepository.seedForRun`: snapshot posisi `testCaseIds` (yang sudah terurut dari `findCasesForPlan`) ke kolom `order`; `findAllByRun` tambah `.order('order')` supaya urutan run selalu konsisten dengan urutan plan saat run dibuat | done   |
| E13-T06 | `testCaseRepository.reorderCases(orderedTestPlanCaseIds)` + `testPlanService.reorderCases()` — bulk update `test_plan_cases.order` sesuai index array baru setelah drag        | done   |
| E13-T07 | `TestPlanDetailPage` tab Test Cases: `DataTable reorderableRows` + `onRowReorder`, aktif hanya saat tidak ada filter/search aktif (`isCaseFilterActive`) — paginator dimatikan saat mode reorder supaya drag selalu terhadap daftar penuh, bukan subset hasil filter | done   |
| E13-T08 | Sequence bersifat panduan, bukan pembatas — **tidak ada validasi urutan** ditambahkan di `recordResult`/`recordStepResult`, tester tetap bebas mencatat hasil test case manapun kapan saja (keputusan produk eksplisit, lihat PRD) | done   |

## E14 — React Query + Realtime Sync (perbaikan data staleness lintas halaman)

Bug yang memicu epic ini: menyelesaikan sebuah Test Run dari halaman detailnya
tidak memperbarui tampilan "Test Runs" di `ProjectDetailPage` — harus refresh
manual. Akar masalah: `ProjectDetailPage` menyimpan hasil fetch tiap tab di
`Map` module-level yang cuma di-invalidate oleh aksi di halaman itu sendiri.
Solusinya dua lapis: (1) ganti seluruh pola fetching manual jadi React Query
dengan query key registry terpusat, supaya mutasi di halaman manapun
menyegarkan semua halaman lain yang baca key yang sama; (2) tambah Supabase
Realtime supaya perubahan dari **user/tab lain** juga otomatis ter-refresh,
bukan cuma dari halaman lain di sesi yang sama. Lihat `docs/ARCHITECTURE.md`
§2.6 untuk rationale teknis lengkap.

### E14.1 — Reshape halaman Test Run jadi satu komponen (prasyarat sebelum React Query)

| ID      | Task                                                                                                                                                                                 | Status |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E14-T01 | Hapus `TestRunDetailPage.tsx` (list terpisah dari E13), gabung jadi satu `TestRunResultDetailPage.tsx` untuk route `/test-runs/:id` — item terpilih via **query param** `?resultId=`, bukan segmen path `/results/:resultId`. Sebab: dua `<Route>` berbeda yang render komponen sama membuat React Router unmount/remount seluruh halaman saat pindah item, breadcrumb sempat kosong sesaat sebelum data ke-fetch ulang | done |
| E14-T02 | Summary/progress bar test run dipindah ke atas grid (selalu terlihat, tidak ikut scroll panel manapun); Panel "Filter" jadi `Panel toggleable` (collapsed default) menyambung visual dengan list tanpa gap | done |
| E14-T03 | Nomor urut di panel kiri list test case (mengikuti urutan hasil filter aktif); tombol navigasi Prev/Next pinned di atas card detail (tidak ikut scroll), shadow muncul hanya saat konten di bawahnya di-scroll | done |
| E14-T04 | Card "Catat Hasil Eksekusi": dropdown status tambah opsi "Belum Dites" (`not_run`) yang sebelumnya hilang/dipaksa jadi "Pass"; tombol "Lihat Test Case Asli" di header card (link ke live template kalau masih ada) | done |
| E14-T05 | Card "Link Issue" diganti total dari inline tab create-form jadi: daftar issue tertaut + tombol "Browse Issues" → dialog `DataTable` paginated (checkbox tautkan/lepas, optimistic update) → tombol "Buat Issue" di dalam dialog itu buka dialog kedua (form lengkap type/module/tag/priority) yang auto-link ke test result aktif saat disimpan | done |
| E14-T06 | Fix bug `42803` "aggregate functions not allowed in FROM" — `issueRepository.findAllByTestRun`/`findAllByTestResult` mendefinisikan relasi `issue_test_results` dua kali dalam satu select string PostgREST (sekali polos, sekali `!inner`); diganti satu select string (`ISSUE_DETAIL_SELECT_INNER_LINK`) yang mendeklarasikan relasi itu sekali saja | done |
| E14-T07 | Fix checkbox di dialog Browse Issues tidak re-render saat toggle — akar masalah: `DataTable` PrimeReact membungkus tiap cell dengan `React.memo` yang membandingkan `rowData`/`field` saja, tidak tahu soal closure `body` yang menangkap `linkedIssueIds` eksternal. Fix: bake status linked ke dalam row data itu sendiri (`issue._linked`) | done |
| E14-T08 | Fix `linkedIssues` tidak termuat saat halaman pertama kali dibuka (baru muncul setelah pindah item) — `useEffect` bergantung `[resultId]` saja padahal `activeResult` resolve async dari `results`; effect di-guard `if (!activeResult) return` dan tidak pernah re-run setelah `results` akhirnya ter-fetch. Fix: tambah `activeResult?.id` ke dependency array | done |
| E14-T09 | Info modul/tag/tester/tanggal eksekusi/catatan hasil ditambahkan ke card detail test case (sebelumnya cuma title/priority/steps/expected result) | done |
| E14-T10 | Fix menu "Arsipkan"/"Hapus" di tab Issues `ProjectDetailPage` saling meniadakan (`canDeleteContent ? [Hapus] : [Arsipkan]`) — admin/manager yang punya hak hapus jadi tidak pernah bisa arsipkan. Diganti jadi dua item independen | done |

### E14.2 — Migrasi seluruh app ke React Query

| ID      | Task                                                                                                                                                                                     | Status |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E14-T11 | `hooks/queryKeys.ts` (baru) — registry terpusat semua query key (`project`, `projects`, `modules`, `tags`, `testPlan(s)`, `testPlanCases`, `testCase(s)`, `testRun(s)`, `testRunResults`, `issue(s)`, `attachmentsByIssue`, `profiles`) — satu-satunya tempat bentuk key didefinisikan, dipakai semua hook & useRealtimeSync | done |
| E14-T12 | Migrasi 8 hook (`useIssues`, `useModules`, `useProfiles`, `useProjects`, `useTestPlanDetail`, `useTestPlans`, `useTestRunDetail`, `useTestRuns`) dari `useState`+`useEffect`+`reload` manual ke `useQuery`/`useQueryClient` — signature return (`{ data, loading, reload }`) dipertahankan supaya pemanggil di halaman tidak perlu berubah | done |
| E14-T13 | Reshape `ProjectDetailPage`: hapus total dua cache module-level (`projectCache`, `tabDataCache`), ganti 7 `useQuery` terpisah (satu per slot tab: testPlans/testCases/modules/tags/testRuns/issues/approvedUsers); `loadAll()` sekarang invalidate query key tab aktif, bukan hapus cache manual | done |
| E14-T14 | Migrasi fetch page-local ke `useQuery` di `TestPlanDetailPage`, `TestRunResultDetailPage`, `TestRunIssuesPage`, `TestCasesPage`, `TestCaseDetailPage`, `IssueDetailPage` — semua mutasi update jadi invalidate `queryKeys.*` yang relevan (termasuk cross-page, mis. `recordResult`/`complete`/`reopen` test run juga invalidate `testRunsByProject`/`testRunsByPlan`, bukan cuma `testRun`/`testRunResults` miliknya sendiri) | done |
| E14-T15 | `main.tsx`: `QueryClient` diberi `staleTime: 30_000` default (bandwidth wajar untuk navigasi cepat, invalidation manual tetap instan lepas dari window ini) | done |

### E14.3 — Supabase Realtime sebagai trigger invalidation lintas klien

| ID      | Task                                                                                                                                                                                 | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E14-T16 | `supabase/schema_realtime_sync.sql` (migration `20260701000016`) — enable Realtime replication (`alter publication supabase_realtime add table ...`, guarded idempotent per tabel) untuk `test_results`, `test_runs`, `issues`, `test_plan_cases`, `test_cases`, `modules`, `tags`, `projects` (`profiles` sudah lebih dulu di-enable) | done |
| E14-T17 | `hooks/useRealtimeSync.ts` (baru) — satu channel `app-realtime-sync`, `.on('postgres_changes', ...)` per tabel, payload di-map ke `queryKeys.*` yang relevan. Tabel tanpa FK yang dibutuhkan di payload (`test_runs` tanpa `project_id`, `test_plan_cases` tanpa `project_id`) invalidate prefix lebih luas (mis. `['testRuns']`) alih-alih menambah query lookup di event handler — keputusan produk, bukan bug | done |
| E14-T18 | Pasang `useRealtimeSync()` **sekali** di `AppLayout.tsx` (dalam `ProtectedRoute`) — bukan per halaman/per hook; cleanup via `supabase.removeChannel(channel)` di return `useEffect` | done |

## E15 — RBAC Per-Project (project_members, role granular)

Reshape RBAC dari dua level global (`user`/`admin`) jadi tambahan role
per-project — lihat `docs/PRD.md` §4.7 dan `docs/ARCHITECTURE.md` §4.1 untuk
rationale dan tabel hak akses lengkap.

| ID      | Task                                                                                                                                                                     | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E15-T01 | `supabase/schema_project_members.sql` — tabel `project_members` (`project_id`, `user_id`, `role` awal 2 nilai), fungsi `has_project_access()`/`is_project_manager()`, trigger `handle_new_project()` auto-add creator sebagai manager | done |
| E15-T02 | `supabase/schema_project_roles.sql` — expand role jadi 4 nilai (`manager`/`supervisor`/`tester`/`member`), fungsi `can_edit_project_content()`/`can_delete_project_content()`/`can_run_tests()`/`can_manage_issues()`, split semua policy `for all` jadi per-operasi (select/insert/update/delete) | done |
| E15-T03 | `hooks/useProjectRole.ts` — hook client-side (`canEditContent`, `canDeleteContent`, `canManageSettings`, `canRunTests`, `canManageIssues`, `canArchiveProject`, `canDeleteProject`) dipakai seluruh halaman untuk menampilkan/menyembunyikan aksi sesuai role — RLS tetap jadi batas keamanan sebenarnya, ini cuma UX | done |
| E15-T04 | Semua halaman detail (`ProjectDetailPage`, `TestPlanDetailPage`, `TestRunResultDetailPage`, `IssueDetailPage`) menyesuaikan tombol aksi berdasarkan `useProjectRole` alih-alih cuma `isAdmin` polos | done |

## Epic E16 — Custom/Unplanned Test Run

Test Run tidak lagi wajib berasal dari Test Plan. Tombol "Buat Test Run" di
tab Test Runs (`ProjectDetailPage`) membuka dialog dua mode: "Dari Test Plan"
(alur lama) atau "Unplanned/Custom" (pilih Test Case langsung, tanpa plan).
Pola schema mengikuti precedent `issues.project_id` di E12: kolom
`test_runs.project_id` ditambah langsung (bukan resolve via join ke
`test_plans`), `test_plan_id` jadi nullable.

| ID      | Task                                                                                                                                                                     | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E16-T01 | `supabase/migrations/20260701000017_custom_test_runs.sql` — tambah `test_runs.project_id` (backfill dari `test_plans.project_id`, lalu `not null`), `test_plan_id` jadi nullable, trigger `check_test_run_project_matches_plan()` (jaga konsistensi kalau `test_plan_id` diisi), index unique `(project_id, code)` menggantikan `(test_plan_id, code)`, rewrite `set_test_run_code()` + RLS `test_runs`/`test_results`/`test_result_steps` supaya resolve project via `project_id` langsung | done |
| E16-T02 | `types/domain.ts`: `TestRun.projectId` (baru), `TestRun.testPlanId: string \| null`; `mapTestRunRow` ikut disesuaikan | done |
| E16-T03 | `testRunRepository.create()` — terima `projectId` (wajib) + `testPlanId` (opsional); `findAllByProject` — ganti inner join `test_plans!inner` jadi left join supaya run tanpa plan tetap muncul | done |
| E16-T04 | `testRunService.startCustom(projectId, name, testCaseIds)` — sibling dari `start()`, tanpa lookup `test_plan_cases`, langsung `seedForRun` dengan `testCaseIds` yang dipilih user | done |
| E16-T05 | Dialog "Buat Test Run" di `ProjectDetailPage` tab Test Runs — `SelectButton` dua mode, dropdown Test Plan (mode plan) atau `MultiSelect` Test Case (mode custom, pola sama seperti dialog "Tambah Test Case ke Plan" di `TestPlanDetailPage`) | done |
| E16-T06 | `useRealtimeSync.ts` — event `test_runs` sekarang punya `project_id` di payload, invalidate `queryKeys.testRunsByProject(projectId)` secara presisi alih-alih fallback prefix luas `['testRuns']` | done |

## Epic E17 — Test Case Template Library, Import CSV, RBAC Field

Tiga penambahan independen ke modul Test Case: (1) library template global
dikelola admin untuk inisialisasi cepat project baru, (2) import test case
massal dari file CSV (bukan Excel/`xlsx` — lihat rationale di E17-T09), dan
(3) field `target_role` sederhana untuk kebutuhan RBAC testing (bukan sistem
custom-fields generik — keputusan eksplisit user).

| ID      | Task                                                                                                                                                                     | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E17-T01 | `supabase/migrations/20260723000001_test_case_templates.sql` — tabel `test_case_templates`/`test_case_template_items`/`test_case_template_item_steps` (global, TIDAK project-scoped), kolom `test_cases.target_role`. RLS bentuk baru: `is_approved()` select, `is_admin()` write | done |
| E17-T02 | `types/domain.ts`: `TestCaseTemplate`, `TestCaseTemplateItem`, `TestCaseTemplateItemStep`, `TestCaseTemplateItemWithSteps`; `TestCase.targetRole`. `helpers/mappers.ts` mapper untuk masing-masing | done |
| E17-T03 | `repositories/testCaseTemplateRepository.ts` (baru) — CRUD template/item/step, mirror pola `testCaseRepository`/`testCaseStepRepository` termasuk `replaceStepsForItem` full-replace | done |
| E17-T04 | `services/testCaseTemplateService.ts` (baru) — validasi create/update item sama seperti `testCaseService`, plus **`cloneItemsToProject(projectId, itemIds)`**: resolve `module_name`/`tag_names` (teks bebas di template) jadi Module/Tag nyata per-project (find-or-create, di-cache per panggilan), lalu `testCaseService.create()` per item | done |
| E17-T05 | `testCaseRepository`/`testCaseService`: teruskan `targetRole` di `create`/`update`, konsisten dengan field opsional lain (`notes`, `objective`) | done |
| E17-T06 | Halaman `pages/test-case-templates/TestCaseTemplatesPage.tsx` (list) + `TestCaseTemplateDetailPage.tsx` (kelola item, reuse pola dialog Test Case termasuk editor detailed steps) — route `/test-case-templates`(`/:id`), TIDAK di dalam `<AdminRoute>` (semua approved user perlu akses baca untuk clone), tombol create/edit/delete digate `isAdmin` in-page | done |
| E17-T07 | Sidebar `AppMenu.tsx` — entry "Test Case Templates" tampil untuk semua approved user (bukan `isAdmin`-only seperti "Users") | done |
| E17-T08 | Clone dari template: dropdown "Mulai dari Template" (opsional) di dialog Project Baru (`ProjectsPage.tsx`) setelah `projectService.create()`; tombol "Import dari Template" di tab Test Cases `ProjectDetailPage.tsx` (pilih template → `MultiSelect` pilih sebagian/semua item → `cloneItemsToProject`) | done |
| E17-T09 | Import CSV: paket `xlsx` (SheetJS) dari npm punya *high-severity* vulnerability tanpa fix (prototype pollution + ReDoS) — diganti CSV murni tanpa dependency eksternal. `helpers/csvImport.ts` (parser RFC 4180 minimal ditulis manual), `services/testCaseImportService.ts` (resolve Module/Tag find-or-create sama seperti clone template), `components/ui/ExcelImportPanel.tsx` (FileUpload custom + preview baris valid/invalid sebelum commit). Scope awal `step_type='simple'` saja | done |
| E17-T10 | UI `target_role`: field `InputText` di dialog Test Case (`ProjectDetailPage.tsx`) dan dialog Item Template, ditampilkan sebagai `Tag` di tabel Test Cases, `TestCaseDetailPage.tsx`, dan card atas `TestRunResultDetailPage.tsx` | done |

> **Rename pasca-E17 (2026-07-25):** modul ini di-rename dari "Test Case
> Template" jadi **"Test Suite"** di seluruh layer (tabel `test_case_templates*`
> → `test_suites`/`test_suite_items`/`test_suite_item_steps`, service/repo/type
> `TestCaseTemplate*` → `TestSuite*`, route `/test-case-templates` →
> `/test-suites`). Task table di atas dibiarkan apa adanya sebagai catatan
> historis (nama lama saat epic ini dikerjakan); state kode saat ini mengikuti
> nama baru — lihat `docs/ARCHITECTURE.md` §6.7 dan migrasi
> `20260725000001_rename_test_case_templates_to_test_suites.sql`.
