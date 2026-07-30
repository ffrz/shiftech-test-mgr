# TODO — Sprint Board Aktif

Titik mulai sesi kerja. Update file ini setiap kali mulai/selesai mengerjakan sesuatu.

## Siap Dikerjakan (next up)

**Platform Evolution V2 — Phase 1–6 done, Phase 7 (closing phase) sedang berjalan.**
Governed by [`docs/PRODUCT_CONSTITUTION.md`](docs/PRODUCT_CONSTITUTION.md) (product
rules, MVP success criteria), lihat [`docs/ARCHITECTURE_V2.md`](docs/ARCHITECTURE_V2.md)
(desain) dan [`docs/ROADMAP_V2.md`](docs/ROADMAP_V2.md) (fase + task detail, framed di
sekitar golden path 9-langkah dari Constitution). Backend Go (`backend/`) **tetap
di-pending** selama roadmap ini berjalan — lihat `backend/README.md`.

- [x] V2-P7-T01 — Golden-path walkthrough — **dianggap selesai via smoke test manual
      (2026-07-29)**, bukan checklist 9-langkah penuh dengan 2 akun terpisah. Detail
      per-fitur (test case granular) menyusul lewat dogfooding di bawah
- [x] V2-P7-T02 — Regresi Testing Domain — **dianggap selesai via smoke test manual
      (2026-07-29)**, sama seperti T01: coverage detail menyusul dari dogfooding, bukan
      dari checklist regresi terpisah
- [x] V2-P7-T03 — Sinkronisasi dokumen ke model V2 yang sudah shipped (CLAUDE.md,
      AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/PRD.md, FEATURES.md — selesai
      2026-07-28, disegarkan lagi 2026-07-29), lihat "Selesai (recent)" di bawah
- [ ] V2-P7-T04 — Bersihkan TODO.md dari item V2 roadmap, kembali ke sprint board normal
      — tunda sampai dogfooding round pertama (lihat item baru di bawah) selesai, supaya
      gap yang ketemu saat dogfood sempat masuk backlog dulu
- [ ] V2-P7-T05 — Merge `feature/platform-foundation` → `master` (setelah T04)

**Dogfooding — susun Test Suite/Test Plan untuk Testify sendiri, pakai app ini untuk
uji app ini:**
- [ ] Buat project "Testify" di Testify sendiri (atau pakai project existing), isi Module
      sesuai domain: Auth, Project, Test Suite, Test Plan/Run/Result, Issue, Settings/
      Profile, Membership/Notification
- [ ] Tulis Test Case untuk golden-path 9-langkah Constitution (register → create project →
      invite → test case → test plan → test run → record result → create issue → timing)
      — ini gantinya walkthrough manual T01, tapi terekam sebagai Test Case beneran,
      bisa di-run ulang tiap rilis
- [ ] Tulis Test Case untuk fitur yang baru landed 2026-07-29 dan belum pernah ditest
      end-to-end: Delete Account + auto-reactivation, `/@username` portfolio-lite (list
      Project/Test Suite publik/unlisted), owner-lock di Members tab, auth race fix
      (`loadProfile` + session)
- [ ] Jalankan Test Run pertama dari Test Plan di atas, catat hasil PASS/FAIL — FAIL jadi
      Issue asli di project ini (dogfood penuh: temuan bug dari testing manual masuk
      lewat modul Issue Testify sendiri, bukan catatan terpisah)

**Backlog (2026-07-25, dari Phase 7 walkthrough)** — belum di-scope, lihat
`docs/ROADMAP_V2.md` bagian "Backlog — captured, not yet scoped or scheduled":
- [ ] Fitur activate/deactivate user (banned sementara/permanen) — butuh diskusi dulu
- [ ] Search/browse Test Suite Template berdasarkan kategori
- [ ] Ganti filter `TestSuitesPage` dari "All Visible Templates" → "Browse Templates" (hanya public milik orang lain, exclude milik sendiri)
- [ ] Brainstorm: metadata Test Suite Template (category/difficulty/est. time/app type/coverage tags) — masih butuh diskusi taxonomy sebelum di-scope
- [ ] Open question: apakah `TestPlanCase` butuh snapshot Test Case + mekanisme sync (edit test case setelah masuk plan tapi sebelum run dimulai saat ini silently ikut versi terbaru) — Testing Domain, bukan V2, belum condong ke arah manapun

**Platform Evolution V2 — Phase 8 (Collaboration & Workflow), baru ditambahkan
2026-07-30** — lihat `docs/ROADMAP_V2.md` bagian "Phase 8" untuk detail lengkap +
alasan urutan. Ringkasan keputusan: Comment/Activity Timeline/Notification-extension/
Attachment-generalization dibangun sebagai SATU fondasi (tabel `entity_activity`
polimorfik + generalisasi `attachments`→`entity_attachments`), bukan 4 fitur/migrasi
terpisah — supaya tidak banyak refactor pas nambah fitur berikutnya. Comment pakai
soft-delete (`deleted_at`), bukan hard delete, biar timeline tidak bolong.

- [x] V2-P8-T01 — Migration `entity_activity` (2026-07-30, `supabase/migrations/20260730000001_entity_activity_and_attachments.sql`, sudah di-push ke remote)
- [x] V2-P8-T02 — Migration generalisasi `attachments`→`entity_attachments` (2026-07-30,
      digabung 1 file dengan T01 sesuai rencana). Write-gate issue attachment TETAP
      `can_manage_issues` (manager/tester saja) lewat fungsi baru
      `can_write_entity_attachment()` — sengaja tidak dilonggarkan ke `is_approved()`
      biar tidak jadi permission widening diam-diam. Entity type lain (test_case/plan/
      run) sementara pakai `is_approved()` sampai T07 kasih model gating yang lebih pas
- [x] V2-P8-T03 — `activityService.ts` + `activityRepository.ts` + `useActivity.ts`
      (2026-07-30), wired ke `useRealtimeSync.ts` + `queryKeys.activity()`. Mention pakai
      `profileRepository.findByUsername()` (exact match), bukan `profileService.search()`
      (partial-match typeahead, salah tool buat parsing `@handle`). `issueRepository`/
      `attachmentService.upload()` disesuaikan ke `entity_attachments` (sekarang butuh
      `projectId`) — 2 call site diperbaiki (`IssueDetailPage.tsx`, `IssueEditor.tsx`).
      `tsc -b` bersih
- [x] V2-P8-T04 — Universal Comment UI (2026-07-30): `ActivityPanel.tsx`, satu
      komponen dipakai buat T04+T05 sekaligus (comment cuma `eventType='comment'` di
      stream yang sama dengan timeline). Dipasang di Issue/TestCase (`Card` prose
      pattern), TestPlan (tab baru "Activity"), TestRun (`Panel` collapsed, scope ke
      seluruh Test Run bukan per-result). `tsc -b` + lint bersih
- [x] V2-P8-T05 — Activity Timeline UI (2026-07-30): `issueService.changeStatus()`/
      `.assign()` + `testRunService.complete()`/`.reopen()` sekarang terima
      `{ projectId, actorId }` dan nge-log event `status_change`/`assignment`.
      7 call site diupdate (`IssueDetailPage`, `IssueTab` 3x termasuk undo path,
      `TestRunIssuesPage` 3x, `TestRunResultDetailPage` 2x) pakai actor dari
      `useAuthContext()`. TestCase/TestPlan belum ada konsep status/assignment jadi
      belum butuh producer — comment aja cukup, sudah ke-cover T04. `tsc -b` + lint
      bersih
- [x] V2-P8-T06 — Notification extension (2026-07-30). Keputusan penerima (dikonfirmasi
      user): notif HANYA ke assignee, bukan broadcast ke semua member project — sama
      seperti pola `mention` yang sudah jalan (T03). `assignment` → notif ke assignee
      baru. `status_change` → notif ke assignee saat ini (skip kalau tidak ada assignee
      atau actor === assignee). Di-wire di `issueService.changeStatus()`/`.assign()`
      (sekarang terima `actorName` juga buat judul notif yang enak dibaca). Semua call
      site (`IssueDetailPage`, `IssueTab`, `TestRunIssuesPage`) sudah kirim `actorName`
      dari `useAuthContext().profile`. `NotificationPanel.tsx` dapat icon mapping per
      type. `AppTopbar.tsx` — klik notifikasi dulu selalu ke `/`, sekarang navigasi ke
      entity yang tepat (`/issues/:id` dst) via `referenceType`/`referenceId`.
      TestCase/TestPlan/TestRun belum ada konsep assignee jadi belum ada notif jenis
      ini di sana. `tsc -b` + lint bersih
- [x] V2-P8-T07 — Attachment UI generalization (2026-07-30): `entityAttachmentRepository.ts`
      + `attachmentService.listForEntity/uploadForEntity/removeForEntity` +
      `AttachmentPanel.tsx` (reusable, pola sama seperti `ActivityPanel`). Dipasang di
      `TestCaseDetailPage` (Card "Attachment" baru), gate `canEditContent`. CATATAN: gate
      UI (manager/supervisor) lebih ketat dari RLS DB (`is_approved()` — semua accepted
      member) buat entity type selain issue — aman (UI lebih sempit dari DB) tapi kalau
      nanti mau role-restrict attachment Test Case kayak issue, RLS-nya perlu diperketat
      juga. `IssueDetailPage`/`IssueEditor` sengaja TIDAK dipindah ke path baru ini (sudah
      jalan, tidak perlu diubah). Comment-body attachment belum dibangun (belum ada UI
      comment editor yang support file) — ditunda, tidak blocking apa pun di Phase 8.
      `tsc -b` + lint bersih
- [x] V2-P8-T08 — Bulk Action (2026-07-30, scope diperluas 2x setelah feedback user).
      Ternyata `BulkActionsBar` sudah ada duluan di 9 tabel, tapi cuma "Delete Selected".
      Feedback user #1: mau 1 komponen shared (sudah — cukup 1 file diubah) + layout
      aksi harus di KIRI dekat checkbox, bukan jauh di kanan — `BulkActionsBar.tsx`
      diubah sekali, otomatis berlaku ke semua 9 tabel. Feedback user #2: mau bulk
      action juga di tabel lain — disepakati scope: **Issue** (bulk status+assign,
      dropdown pair di bar), **Test Plan** (bulk status, 1 dropdown di bar), **Test
      Case** (tombol "Bulk Edit" buka Dialog berisi Module/Priority/Status/Target Role,
      field kosong = tidak diubah — pakai sentinel `UNSET` internal karena `null` itu
      pilihan valid buat Module/Target Role, jadi tidak bisa dipakai sebagai penanda
      "belum disentuh"). 6 tabel lain (Member/Module/Tag/TestRole/PlanTestCases/
      TestRun) SENGAJA dibiarkan bulk-delete-only, bukan kekurangan.
      `issueService.bulkChangeStatus/.bulkAssign`, `testPlanService.changeStatus`
      (sekalian dapat activity logging yang belum ada)/`.bulkChangeStatus`,
      `testCaseService.bulkUpdate` — semua loop sequential manggil method single-row
      yang sudah ada, jadi activity log + notifikasi T05/T06 otomatis ikut.
      Susulan (masih sesi sama, feedback user): Issue awalnya pakai 2 dropdown inline
      di bar (beda pola dari Test Case yang pakai dialog) — diseragamkan jadi tombol
      "Bulk Edit" + Dialog juga (props `onBulkChangeStatus`/`onBulkAssign` digabung
      jadi `onBulkEdit`). Kedua dialog (Issue + TestCase) juga diganti dari label
      statis ke floating label `ifta-field` sesuai konvensi form dialog lain di
      project (CLAUDE.md). `tsc -b` + lint bersih, tidak ada warning baru
- [x] V2-P8-T09 — Saved Filter / My Views: **di-skip (2026-07-30), keputusan produk**.
      Ternyata sudah ada `useStoredState` yang auto-simpan kombinasi filter tiap tabel
      ke localStorage per project (bertahan lintas sesi tanpa aksi user). Yang belum
      ada: banyak view bernama per tabel, filter ikut akun lintas device (localStorage
      = per-browser), share view ke tim. Diputuskan cukup dengan yang sudah ada
      sekarang — tidak dibangun tabel `saved_filters` baru. Bisa direvisit kalau nanti
      ada kebutuhan nyata untuk multi-view atau view yang di-share ke tim
- [x] V2-P8-T10 — Dashboard "My Work" + Activity Feed (2026-07-30). Scope dikonfirmasi
      user: My Work = issue assigned ke saya yang belum closed, lintas project (bukan
      test run, biar tidak campur 2 konsep beda). Activity Feed = aktivitas terbaru
      dari SEMUA project yang saya akses (bukan cuma mention/assignment — RLS sudah
      scope otomatis, dan kalau dipersempit "cuma soal saya" bakal tumpang tindih sama
      NotificationPanel yang sudah ada). Tidak ada tabel baru — baca dari `issues`/
      `entity_activity` yang sudah ada, scoped gratis lewat RLS sama seperti
      `findRecentProjects`/`findContinueWorking`. Extract 2 helper shared (sesuai
      concern user soal duplikasi di T08): `helpers/activityRoutes.ts` (route mapping
      yang tadinya duplikat inline di `AppTopbar.tsx`) dan `helpers/activityDescribe.ts`
      (`describeSystemEvent` yang tadinya private function di `ActivityPanel.tsx`).
      `useRealtimeSync.ts` di-extend biar kedua feed live-update. `tsc -b` + lint bersih
      Fix susulan (feedback user): `describeSystemEvent` (dipakai `ActivityPanel` DAN
      `HomePage`, jadi 1 fix berlaku di semua tempat) tadinya nampilin status mentah
      dari DB (`open` → `in_progress`) alih-alih label yang sudah di-translate (`Open`
      → `In Progress`). Diperbaiki dengan resolve status via `ISSUE_STATUS_LABEL`/
      `TEST_PLAN_STATUS_LABEL`/`TEST_CASE_STATUS_LABEL`/`TEST_RUN_STATUS_LABEL` sesuai
      `entityType` payload-nya, bukan tampilkan raw value.
      Gap susulan #2 (ditemukan user): Project tidak punya tab Activity padahal Issue/
      TestCase/TestPlan/TestRun punya — ternyata bukan keputusan sengaja, cuma karena
      `entity_type` di migration awal (T01) cuma cover 4 entity Testing Domain, Project
      kelewat. Diputuskan: Project MEMANG butuh activity/comment sendiri (diskusi level
      project, catatan rilis/freeze). Fix: migration `20260730000002` tambah `'project'`
      ke CHECK constraint `entity_activity`+`entity_attachments`, `ActivityEntityType`
      dapat `'project'`, tab "Activity" baru di `ProjectDetailPage.tsx`.
      Gap susulan #3 (ditemukan user): comment belum bisa dilampiri file — padahal buat
      QA, screenshot/log itu penting di diskusi. Scope disepakati: attachment PER
      comment (bukan 1 bucket buat semua comment di 1 entity), sama kayak Slack/GitHub.
      `entity_attachments.entity_type` dapat value `'comment'` — DI MIGRATION TERPISAH
      (`20260730000003`) karena `20260730000002` sudah kepush duluan ke remote sebelum
      permintaan ini masuk, dan Supabase CLI nge-track migration by FILENAME bukan ISI
      FILE, jadi edit file yang sudah applied itu diam-diam tidak kepush lagi di `db
      push` berikutnya — dicatat sebagai gotcha buat next time. Tipe baru
      `AttachmentEntityType = ActivityEntityType | 'comment'` (dipisah dari
      `ActivityEntityType` karena comment tidak bisa di-comment lagi). `ActivityPanel.tsx`
      dapat sub-component `CommentAttachments` (query/upload/remove sendiri per komentar,
      cuma pemilik komentar yang bisa kelola). `tsc -b` + lint bersih di ketiga fix ini
- [x] V2-P8-T11 — Audit Log (2026-07-30) — **shipped admin-only dulu, LANGSUNG
      di-redesign hari yang sama** setelah user bilang "semua orang butuh ini juga,
      saya sebagai project owner harus bisa pantau aktivitas project saya". Desain
      admin-only itu memang salah dari awal — project owner belum tentu admin
      platform. Redesign: pindah dari halaman `/audit-log` admin-only jadi tab BARU
      "Activity Log" di `ProjectDetailPage` (`ActivityLogTab.tsx`), scoped ke 1 project,
      akses SAMA seperti tab "Activity" yang sudah ada (semua member project, bukan
      cuma manager/owner). Sempat ada kebingungan soal apakah tab "Activity" yang lama
      ternyata mencampur semua aktivitas project (yang kalau iya berarti gagal desain)
      — sudah diklarifikasi TIDAK, tab "Activity" tetap murni per-entity (1 Issue/1
      TestPlan/1 Project doang), tab baru "Activity Log" itu yang menggabungkan SEMUA
      entity dalam 1 project. Nama "Activity Log" dipilih user biar beda jelas dari
      "Activity" (bukan "Comments" karena isinya juga ada system event, bukan "Project
      Activity" karena mirip nama tab yang sudah ada).
      Fitur tambahan: search box buat cari isi komentar (`.ilike('payload->>body', ...)`
      — sintaks JSON-path PostgREST, belum pernah dipakai di codebase ini, sudah
      diverifikasi via `curl` langsung ke Supabase REST endpoint sebelum dipakai).
      Search CUMA cari comment body (dikonfirmasi ke user dulu) — deskripsi system
      event kayak "changed status..." itu di-generate di frontend, bukan teks
      tersimpan, jadi tidak ada yang bisa di-search buat baris itu. Search box pakai
      `className="flex-1"` di `SearchInput` biar ngisi sisa ruang baris filter (pola
      sama kayak toolbar `IssueTab.tsx`). `pages/admin/AuditLogPage.tsx` + route
      `/audit-log` + menu Administration-nya SUDAH DIHAPUS, bukan dibiarkan jadi
      halaman kedua yang paralel. `tsc -b` + lint bersih
      Polish susulan (setelah coba di browser): (1) kolom "Event" tampilkan raw value
      (`status_change` dst) — ditambah `eventTypeLabel()` di `helpers/activityDescribe.ts`.
      (2) Paginasi "Show [n]" tidak ada pilihan — ternyata `rowsPerPageOptions` kelewat
      pas bikin tab ini (semua tabel paginated lain di app selalu pasang ini), sekarang
      `[10, 20, 50, 100]` sama kayak `IssueTab`. (3) Filter Entity Type diganti dari
      Dropdown single-select jadi MultiSelect (`entityTypes: string[]`, query pakai
      `.in()` bukan `.eq()`)

**Phase 8 (Collaboration & Workflow) SELESAI — semua 11 task (T01-T11) done**, termasuk
T11 yang sempat di-redesign di hari yang sama. Lihat `docs/ROADMAP_V2.md` bagian Phase 8
buat detail lengkap tiap task + fix susulan yang ditemukan pas dogfooding (status label,
Project Activity tab, comment attachment, redesign Activity Log).

Item lama (non-V2), tetap terbuka tapi bukan prioritas saat ini:

- [ ] E03-T06 — Filter test case by priority/status di list
- [ ] Cek ulang: apakah role user lain (selain admin pertama) sudah login ulang & di-set sesuai `backups/restore_roles.sql`? Dibuat saat reset database 2026-07-22, kemungkinan sudah selesai tapi belum dikonfirmasi
- [ ] Reporting (Dashboard/PDF/HTML/execution mode mobile) — belum diprioritaskan, lihat `docs/PRD.md` §7 Roadmap

## Sedang Dikerjakan

- [ ] Dogfooding — susun Test Suite/Test Plan/Test Case untuk Testify sendiri di dalam
      Testify, jalankan Test Run untuk detail testing (menggantikan checklist walkthrough
      manual T01/T02 yang formal) — lihat item di "Siap Dikerjakan" di atas

## Diblokir

_(kosong)_

## Selesai (recent)

- [x] Scaffold project + clean architecture layer + dokumentasi awal (2026-07-21)
- [x] Modul User Management + Google Login + RBAC (pending/user/admin) — kode & RLS lengkap (2026-07-21)
- [x] Dark/light/system theme toggle + primary color teal muted konsisten kedua tema (2026-07-21)
- [x] Test Management v2: Module, Tag, Test Run, Test Result, Issue — reshape besar dari model "last_result" ke riwayat eksekusi penuh (2026-07-21)
- [x] Restrukturisasi monorepo `frontend/` + `backend/` (2026-07-21)
- [x] Audit gap pasca-E08: tab Tags (list/rename/hapus) + halaman Test Runs lintas project + item sidebar (2026-07-22)
- [x] Kode entity auto-generate (MOD/TC/TP/TR-####) untuk Module, Test Case, Test Plan, Test Run — default otomatis, selalu bisa diedit (2026-07-22)
- [x] E12 — Issue & Feature Tracking v2: reshape Issue jadi project-level dengan relasi N:M ke Test Result, Test Case structured steps (`step_type`), storage adapter untuk attachment (2026-07-22)
- [x] Migrasi ke Supabase CLI (`supabase/migrations/`, `supabase db push`) + reset total database production, backup & restore data user (2026-07-22)
- [x] E13 — Sequence (drag & drop urutan eksekusi) pada Test Plan via `test_plan_cases.order`, diwariskan ke Test Run saat dimulai (2026-07-22)
- [x] E15 — RBAC per-project (`project_members`, role `manager`/`supervisor`/`tester`/`member`) — independen dari role global `user`/`admin` (2026-07-22)
- [x] E14.1 — Gabung halaman list+detail Test Run jadi satu komponen (`TestRunResultDetailPage`, item terpilih via `?resultId=`) — fix bug breadcrumb kosong sesaat akibat React Router remount; ganti Link Issue dari inline tab jadi Browse Issues (paginated) + Create dialog bertingkat; beberapa polish UI (summary selalu terlihat, filter collapsible, nomor urut, Prev/Next pinned, status "Belum Dites", link ke test case asli, info modul/tag/tester di detail) (2026-07-22)
- [x] E14.2 — Migrasi seluruh app dari `useState`+`useEffect` manual ke React Query (`hooks/queryKeys.ts` sebagai registry key terpusat) — memperbaiki bug utama: menyelesaikan Test Run dari halaman detailnya tidak lagi butuh refresh manual untuk terlihat update di tab "Test Runs" `ProjectDetailPage` (2026-07-22)
- [x] E14.3 — Supabase Realtime sync (`useRealtimeSync`, satu subscriber terpusat di `AppLayout`) — perubahan dari user/tab browser lain juga otomatis ter-refresh, bukan cuma lintas halaman di sesi yang sama (2026-07-22)
- [x] E17 lanjutan — Test Role master per project (`test_roles`), `test_cases.target_role` (teks bebas) → `target_role_id` FK (2026-07-23)
- [x] Rebrand internal tool → produk **Testify** (`docs/PRODUCT_CONSTITUTION.md`), rename Test Case Template → Test Suite, tambah `landing/` + `public-docs/` (Astro Starlight) + `deploy/deploy-vps.sh` (2026-07-25)
- [x] V2 Phase 1 — Identity split `profiles`→`users`+`profiles`, verified staging, zero discrepancy (2026-07-25)
- [x] V2 Phase 2 — Drop approval gate, signup self-serve (2026-07-25)
- [x] V2 Phase 3 — Project ownership (`owner_id`/`owner_type`) + visibility (`private`/`unlisted`/`public`) (2026-07-25)
- [x] V2 Phase 4 — Membership invite/accept flow (`project_members.status`), "Pending Invitations" card di Home, notifikasi bell + panel untuk lifecycle undangan (2026-07-25 s.d. 2026-07-28, termasuk beberapa iterasi fix RLS/RPC untuk invited user melihat nama project — lihat migrasi `20260727000013`, `20260728000005`–`007`)
- [x] V2 Phase 5 — Test Suite Template ownership + visibility, buka create/edit/delete ke semua user (2026-07-25)
- [x] V2 Phase 6 — Minimal public identity lookup `/@username` + `UsernamePicker` (2026-07-25)
- [x] PWA setup — manifest.json, icon generator (`frontend/scripts/generate-icons.mjs`, sharp-based, generate dari `testify-logo.png`), one-time username change guard (2026-07-28)
- [x] Sinkronisasi dokumentasi menyeluruh ke state kode saat ini (README, CLAUDE.md, AGENTS.md, docs/ARCHITECTURE.md, docs/PRD.md, FEATURES.md, TODO.md) — bagian dari V2-P7-T03, ditemukan banyak drift: rebrand Testify belum konsisten di semua file, backend Go ternyata jauh lebih lengkap dari sekadar "kosong", `public-docs/`/`landing/`/`deploy/` belum terdokumentasi sama sekali, notifications sudah shipped padahal ROADMAP_V2 masih bilang "deferred" (2026-07-28)
- [x] rename `github_links` → `external_links` di kolom Issue + docs (FEATURES.md, ARCHITECTURE.md, PRD.md) (2026-07-29)
- [x] optimize `projectDuplicateService` — batch insert (bukan loop per-row) untuk module/role/test case/step/plan-case/issue (2026-07-29)
- [x] Delete Account (Settings Danger Zone) + auto-reactivation saat login ulang — RPC `delete_account()`/`reactivate_account()`; sekalian fix security gap `has_project_access()` yang belum cek `is_approved()` (2026-07-29)
- [x] `PublicProfilePage`/`UserDetailPage` pakai `ProfileView` reusable, `/@username` sekarang tampilkan daftar Project/Test Suite publik/unlisted milik user (portfolio-lite, extend Phase 6) (2026-07-29)
- [x] `TestSuitesPage` tampilkan username author per baris; fix validation error mapping di `TestSuiteDetailPage` item dialog (2026-07-29)
- [x] Fix auth race condition — `useAuth.tsx` `loadProfile` sekarang terima `session` eksplisit (2026-07-29)
- [x] Fix owner role/action changes di project Members tab (owner tidak boleh diubah/dihapus lewat UI biasa) (2026-07-29)
- [x] `deploy/deploy-vps.sh` — incremental rsync dengan `--link-dest` untuk deploy lebih cepat (2026-07-29)

- [x] Keputusan: `/@username` portfolio-lite (list Project/Test Suite publik/unlisted) **diterima secara sadar**, bukan scope creep — Testify berkomitmen ke arah platform self-serve, identitas yang menampilkan project/suite yang benar-benar dimiliki user adalah kebutuhan fungsional (evaluasi kolaborator, browse author template), bukan vanity metric. Tetap bukan social network (tanpa like/follow/comment/feed/stats). Lihat catatan "reaffirmed 2026-07-29" di `docs/ARCHITECTURE_V2.md` dan `docs/ROADMAP_V2.md` Phase 6 (2026-07-29)
- [x] Import CSV mendukung `step_type=detailed` (multi-step) — kolom Steps format `Aksi | Expected;Aksi | Expected` diparse jadi `test_case_steps` ternormalisasi; tanpa `|` tetap `simple` (backward compatible, tidak perlu kolom header baru). Berlaku untuk import Test Case (`ExcelImportPanel`/`testCaseImportService`) maupun import item Test Suite (`TestSuiteDetailPage` — sebelumnya hardcode `simple` padahal `testSuiteService.addItemsMany` sudah siap terima `detailedSteps`). File `test-suite.csv` di root ditambah 2 baris contoh test case untuk fitur ini (2026-07-29)
- [x] Hapus `test-cases.csv` (bahasa Inggris, berbasis model `pending`/approval lama — sepenuhnya obsolete), generate ulang `test-suite.csv` (Indonesia) total dari nol — 108 test case mencakup semua modul aktual: Autentikasi self-serve, Membership & Notifikasi, Project ownership/visibility, Test Role master, Test Suite ownership, Settings & Public Profile portfolio-lite, Delete/Reactivate Account, dll (2026-07-29)
- [x] Extract `FilterToolbar` component — konsolidasi pola tombol toggle filter + grid filter collapsible yang berulang di tab Issue/Member/TestCase/TestPlan/TestRun (project) dan PlanTestCases/PlanTestRuns (test plan) (2026-07-30)
- [x] Redesign header halaman detail (Project/TestCase/Issue/TestPlan/TestSuite/User + `ProfileView`) — pola baru `project-stat-grid`/`project-stat-tile` (compact stat tile dengan icon) dan `detail-content-col`/`detail-content-card` (max-width reading column + judul card diperkecil), plus `projectService.getSummaryCounts()` untuk tile header Project detail (2026-07-30)
- [x] Redesign Home dashboard — icon badge berwarna di kartu Statistics, icon di setiap section header, hover-elevate di kartu Continue Working/Recent Projects biar tidak terlalu kosong (2026-07-30)
