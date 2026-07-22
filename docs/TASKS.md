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
| E13-T01 | Halaman baru `pages/test-runs/TestRunResultDetailPage.tsx`, route `/test-runs/:runId/results/:resultId` — layout 2 kolom: panel kiri daftar test case + filter (status/prioritas/module/tag/search), panel kanan detail + record hasil + step checklist + link issue (semua inline, bukan dialog) | done   |
| E13-T02 | `TestRunDetailPage` disederhanakan jadi halaman list murni: hapus semua dialog (detail/record/link issue), tambah toolbar filter yang sama, `onRowClick` → `navigate` ke halaman detail baru | done   |
| E13-T03 | `testResultRepository.findAllByRun`: join `test_case.module`/`test_case.test_case_tags` supaya filter module/tag bisa jalan tanpa query tambahan; `TestResultWithDetails.testCase` tipenya jadi `TestCaseWithDetails \| null` | done   |
| E13-T04 | `supabase/schema_test_run_order.sql` (migration `20260701000014`) — tambah `test_results.order` (snapshot `test_plan_cases.order` saat run dimulai), backfill row lama, index `(test_run_id, order)` | done   |
| E13-T05 | `testResultRepository.seedForRun`: snapshot posisi `testCaseIds` (yang sudah terurut dari `findCasesForPlan`) ke kolom `order`; `findAllByRun` tambah `.order('order')` supaya urutan run selalu konsisten dengan urutan plan saat run dibuat | done   |
| E13-T06 | `testCaseRepository.reorderCases(orderedTestPlanCaseIds)` + `testPlanService.reorderCases()` — bulk update `test_plan_cases.order` sesuai index array baru setelah drag        | done   |
| E13-T07 | `TestPlanDetailPage` tab Test Cases: `DataTable reorderableRows` + `onRowReorder`, aktif hanya saat tidak ada filter/search aktif (`isCaseFilterActive`) — paginator dimatikan saat mode reorder supaya drag selalu terhadap daftar penuh, bukan subset hasil filter | done   |
| E13-T08 | Sequence bersifat panduan, bukan pembatas — **tidak ada validasi urutan** ditambahkan di `recordResult`/`recordStepResult`, tester tetap bebas mencatat hasil test case manapun kapan saja (keputusan produk eksplisit, lihat PRD) | done   |
