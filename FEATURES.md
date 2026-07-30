# FEATURES — Status Checklist

Ringkasan cepat status fitur per modul. Detail task-level ada di [`docs/TASKS.md`](docs/TASKS.md).

## Projects
- [x] List project (DataTable) — search, filter status, sortable
- [x] Create & Edit project (Dialog form)
- [x] Status lifecycle: Aktif / Nonaktif / Arsip (menu aksi per baris)
- [x] Hapus Permanen (dengan konfirmasi, cascade ke module/test plan/test case/test run/test result/issue)
- [x] Halaman detail project (`/projects/:id`) — info + tab Test Plans / Test Cases / Modules / Tags / Test Runs / Issues
- [x] **Ownership + Visibility** (V2 Phase 3) — `owner_id`/`owner_type`, `visibility` (`private`/`unlisted`/`public`) diatur di `ProjectSettingsPage` tab Danger Zone
- [x] `ProjectSettingsPage` — tab Members (invite/reinvite/remove) terpisah dari detail page
- [x] Duplicate project (`projectDuplicateService`) — clone struktur (test plan/case/issue pilihan) tanpa riwayat run
- [ ] Project selector global (dipakai lintas halaman)

## Kode Entity (Module, Test Case, Test Plan, Test Run, Issue)
- [x] Auto-generate `MOD-####`/`TC-####`/`TP-####`/`TR-####`/`ISS-####` per project (trigger DB, race-safe)
- [x] Unik per project (`entity_code_sequences` di-key oleh `project_id`+`prefix`) — project baru selalu mulai dari `-0001` lagi, bukan lanjut nomor global
- [x] Selalu bisa diedit manual dari field "Kode" di form masing-masing
- [x] Ditampilkan sebagai kolom di semua tabel terkait + judul halaman detail

## Comment / Activity / Notification / Attachment (Collaboration, Platform Evolution V2 Phase 8)
- [x] Comment thread universal (`ActivityPanel.tsx`) di halaman detail Issue/TestCase/TestPlan/TestRun/Project — edit/soft-delete komentar sendiri, reply 1 level
- [x] Activity Timeline (comment + system event `status_change`/`assignment` dalam satu stream kronologis) di halaman yang sama
- [x] Tab "Activity Log" di Project Detail — gabungan semua aktivitas Issue/TestCase/TestPlan/TestRun/Project dalam satu project, search isi komentar, filter Entity Type & tanggal
- [x] Mention `@username` di komentar — autocomplete dropdown saat mengetik, resolve ke profile asli (typo/tidak ketemu = teks polos, bukan link mati), kirim notifikasi ke user yang di-mention
- [x] Cross-reference `#code` (Test Case) dan `!code` (Issue) di komentar — autocomplete + link ke halaman detail entity, **scoped ke project yang sedang dibuka** (kode dari project lain tidak akan resolve/link)
- [x] Attachment per-comment (upload/hapus, hanya pemilik komentar) + attachment generalisasi (`entity_attachments`) untuk Test Case, terpisah dari attachment Issue yang sudah ada sejak E12
- [x] Notifikasi `mention`/`assignment`/`status_change` — hanya ke user yang relevan (mentioned user / assignee), bukan broadcast ke semua member project
- [x] Dashboard Home: "My Work" (issue assigned ke saya, belum closed, lintas project) + "Activity Feed" (aktivitas terbaru lintas project yang saya akses)

## Modules & Tags
- [x] CRUD Module per project (tab "Modules" di Project Detail)
- [x] Tag creatable (dropdown Chips di form Test Case, otomatis buat tag baru per project)
- [x] Tab "Tags" di Project Detail — list, rename, hapus tag yang sudah ada

## Test Cases
- [x] CRUD lengkap per project (tab "Test Cases" di Project Detail): Module, Objective, Preconditions, Steps, Expected Result, Priority, Tags, Notes
- [x] Status `active`/`archived` (arsipkan alih-alih hapus untuk retensi riwayat)
- [x] List lintas project (`TestCasesPage`, read-only, pilih project via dropdown)
- [x] Delete + konfirmasi
- [x] Field **Role Target** (E17) — teks bebas (mis. "Admin", "Manager") untuk RBAC testing; test case yang sama secara konsep diuji ulang manual per role (duplikasi manual, bukan sistem varian). Tampil di tabel, detail, dan Test Run Result Detail
- [x] **Import dari Excel/CSV** (E17) — tombol di tab Test Cases, baca file CSV client-side (tanpa dependency `xlsx` karena vulnerability terbuka di npm — Excel/Sheets tetap bisa export CSV native), preview baris valid/invalid sebelum commit
- [x] **Import CSV mendukung `step_type=detailed`** (2026-07-29) — kolom Steps format `Aksi | Expected;Aksi | Expected` diparse jadi step ternormalisasi (`test_case_steps`); tanpa karakter `|` tetap `simple` (backward compatible). Berlaku untuk import Test Case maupun import item Test Suite
- [ ] Filter by priority/status di list

## Test Suite Library (E17, renamed from "Test Case Template Library")
- [x] Library global (bukan per-project) — `TestSuitesPage`/`TestSuiteDetailPage`, sidebar "Test Suite"
- [x] **V2 Phase 5**: kepemilikan per-user (`owner_id`) + `visibility` (`private`/`unlisted`/`public`) — TIDAK LAGI admin-only. Siapa pun bisa create suite privat; publish `public` membuatnya terlihat & bisa di-clone user lain. Filter "My Templates" vs "All Visible Templates" di `TestSuitesPage`
- [x] Item suite mendukung `simple`/`detailed` step_type sama seperti Test Case biasa, plus Role Target dan Tag (teks bebas — module/tag di-resolve find-or-create ke project nyata saat clone)
- [x] Clone saat inisialisasi project baru (dropdown "Mulai dari Template" opsional di dialog Project Baru) atau kapan saja lewat tombol "Import dari Template" di tab Test Cases (pilih sebagian item, bukan wajib semua)
- [x] `TestSuitesPage` tampilkan username author (owner) per baris, link ke `/@username`

## Test Plans
- [x] CRUD test plan per project (tab "Test Plans" di Project Detail)
- [x] Tab Test Cases: kelola cakupan (tambah/keluarkan test case dari plan — TANPA hasil, hanya cakupan)
- [x] Sequence: drag & drop urutan eksekusi test case (`test_plan_cases.order`) — panduan workflow, bukan pembatas eksekusi (E13)
- [x] Tab Test Runs: mulai run baru, lihat riwayat semua run

## Test Runs & Test Results
- [x] Halaman Test Runs lintas project (`/test-runs`, sidebar) — semua run dari semua plan dalam satu project
- [x] Mulai Test Run baru (snapshot cakupan test case plan saat itu, termasuk urutannya)
- [x] Test Run Unplanned/Custom (E16) — tombol "Buat Test Run" di tab Test Runs (Project Detail) dengan dua mode: Dari Test Plan (alur lama) atau Unplanned/Custom (pilih Test Case langsung tanpa Test Plan, `test_runs.test_plan_id` nullable)
- [x] Halaman detail test run + test case (`TestRunResultDetailPage`, satu komponen untuk `/test-runs/:id` dan item terpilih via `?resultId=`, E13/E14) — panel kiri daftar+filter (status/prioritas/module/tag/search, nomor urut) scroll independen dari panel kanan (detail + record hasil + step checklist + link issue), navigasi Prev/Next pinned, summary/progress selalu terlihat di atas
- [x] Info modul/tag/tester/tanggal eksekusi/catatan hasil di card detail test case, tombol "Lihat Test Case Asli" (link ke live template)
- [x] Catat hasil per test case: status (pass/fail/skip/blocked/**belum dites**), tester (dropdown user terdaftar), catatan
- [x] Checklist hasil per-step untuk Test Case bertipe `detailed`
- [x] Ringkasan progress otomatis (pass/fail/skip/blocked/belum dites, persentase)
- [x] Selesaikan Run (manual) / Buka Kembali

## Issue & Feature Tracking v2 (E12)
- [x] Reshape `issues`: level-project (`project_id` wajib, `module_id` nullable), relasi ke Test Result jadi N:M via `issue_test_results`
- [x] Kolom `type` (bug/feature/improvement/task) — sekaligus jadi feature tracking sederhana
- [x] Tag many-to-many ke Issue (`issue_tags`, reuse master Tag)
- [x] Tab Issues di Project Detail + `IssueDetailPage` — direshape untuk model project-level (filter type/status/priority/module/tag, dialog create standalone, menu row **Arsipkan** dan **Hapus** independen)
- [x] Dialog Create/Edit Issue (`IssueEditor.tsx`) punya field Code dan Status di baris paling atas — Code opsional (kosong = auto-generate), Status default Open saat create (disabled) dan saat edit terhubung ke `issueService.changeStatus()` (logged + notifikasi assignee), bukan update field biasa
- [x] Card "Link Issue" di detail Test Run: daftar issue yang sudah tertaut + tombol "Browse Issues" → dialog paginated (checkbox tautkan/lepas, update instan) → tombol "Buat Issue" di dalamnya buka dialog form lengkap yang auto-link ke test result saat disimpan
- [x] Badge jumlah issue tertaut per test case
- [x] External links (`{url, label?}[]`) — link klik saja, bukan integrasi API, dikelola di dialog Edit Issue
- [x] Attachment via storage adapter — upload/hapus di `IssueDetailPage`

## Test Case — Structured Steps (E12)
- [x] `step_type`: `simple` (teks bebas, seperti sekarang) atau `detailed` (baris `test_case_steps` ternormalisasi, toggle `SelectButton` di form Test Case)
- [x] Hasil per-step (`test_result_steps`) saat Test Run mengeksekusi Test Case `detailed` — checklist pass/fail per step di dialog Catat Hasil

## User Management & Auth (RBAC)
- [x] Login via Google OAuth (Supabase Auth)
- [x] **Self-serve signup** (V2 Phase 2) — TIDAK ADA lagi status `pending`/approval admin; role langsung `user` saat signup
- [x] **Identity split** (V2 Phase 1) — `users` (privat: email/role) + `profiles` (publik: username/displayName/avatarUrl/bio), auto-provisioning keduanya saat signup
- [x] RLS berbasis role global (`user`/`admin`) + akses per-project via `project_members.status='accepted'`
- [x] RBAC per-project (E15): tabel `project_members`, role `manager`/`supervisor`/`tester`/`member` — hak edit/hapus/jalankan-test/kelola-issue berbeda per role, independen dari role global. Creator project otomatis jadi `manager`. `supervisor` juga bisa jalankan test sejak migrasi `20260728000008`
- [x] `useProjectRole` hook — dipakai semua halaman detail untuk tampilkan/sembunyikan aksi sesuai role per-project
- [x] Halaman Login — `PendingApprovalPage` sudah **dihapus** (V2 Phase 2, tidak ada lagi gate approval untuk di-redirect)
- [x] Route guard (`ProtectedRoute` — hanya cek login, `AdminRoute` — hanya screen admin-ops)
- [x] Halaman User Management: promote/demote admin↔user, hapus (soft-delete), lihat detail — aksi **Approve**/**Cabut Akses** sudah dihapus (V2 Phase 2, tidak relevan lagi)
- [x] Halaman detail user (`/users/:id`)
- [x] Halaman Settings (`/settings`) — edit `username` (sekali ganti seumur hidup), `displayName`, `avatarUrl`, `bio`, toggle tema
- [x] Settings Danger Zone — **Delete Account**: hapus permanen project & test suite milik sendiri, anonymize `users`/`profiles`; login ulang via Google dengan email sama otomatis **reactivate** akun (identitas baru, data lama tidak kembali) — RPC `delete_account()`/`reactivate_account()`
- [x] Halaman `/@:username` (`PublicProfilePage`, via `ProfileView` reusable) — identitas (nama, avatar, bio) + daftar Project & Test Suite milik user yang `public`/`unlisted` (semua termasuk `private` kalau lihat profil sendiri), dipakai juga sebagai target-picker undangan (V2 Phase 6). Admin lihat profil orang lain dapat flag "spying" di UI
- [x] `UserDetailPage` (admin) pakai `ProfileView` yang sama + card info akun (email/role)
- [x] Layout: avatar, nama user, logout, menu khusus admin, dark mode toggle, bell notifikasi
- [x] Konfigurasi Google OAuth di Supabase Dashboard — selesai
- [x] Set admin pertama — selesai

## Platform Evolution V2 (identity, ownership, membership — lihat `docs/ARCHITECTURE_V2.md`/`docs/ROADMAP_V2.md`)
- [x] Phase 1 — Identity split `profiles`→`users`+`profiles`
- [x] Phase 2 — Drop approval gate (self-serve signup)
- [x] Phase 3 — Project ownership (`owner_id`/`owner_type`) + visibility (`private`/`unlisted`/`public`)
- [x] Phase 4 — Membership invite/accept flow (`project_members.status`), notifications (bell + panel), "Pending Invitations" card di Home
- [x] Phase 5 — Test Suite Template ownership (`owner_id`) + visibility, buka create/edit/delete ke semua user (bukan admin-only)
- [x] Phase 6 — Minimal public identity lookup (`/@username`), `UsernamePicker` component
- [ ] Phase 7 — Golden-path walkthrough + regresi Testing Domain **dianggap selesai lewat smoke test manual (2026-07-29)**, dokumentasi sinkron sudah selesai. Sudah landed di Phase 7: `/@username` portfolio-lite (daftar Project/Test Suite publik/unlisted — keputusan sadar, bukan scope creep), Delete Account + auto-reactivation, fix keamanan soft-delete (`has_project_access()` kini benar-benar cek `is_approved()`). Sisa: **dogfooding** — susun Test Suite/Test Plan/Test Case Testify di dalam Testify sendiri untuk detail testing berkelanjutan (gantikan checklist walkthrough manual satu-kali)

## Test Cases — Test Role (lanjutan E17)
- [x] `test_cases.target_role` (dulu teks bebas) diganti `target_role_id` FK ke tabel master `test_roles` per project (pola sama seperti Module) — migrasi `20260723000002_test_roles.sql`

## Project — Duplicate & Settings
- [x] `projectDuplicateService.duplicateProject()` — clone Test Plan/Test Case/Issue terpilih ke project baru, TANPA riwayat Test Run/Test Result
- [x] `ProjectSettingsPage` — tab Members (invite/reinvite/remove + status badge) dan Danger Zone (visibility, active/inactive, archive, hapus permanen)

## Infrastruktur
- [x] Supabase schema domain + RLS berbasis role — 16 migrasi berurutan, dikelola via **Supabase CLI** (`supabase/migrations/`, `supabase db push`), bukan lagi copy-paste manual ke SQL Editor
- [x] Clean architecture layers (Repository/Service/Hook/Component) — Repository/Service tidak berubah oleh React Query/Realtime, keduanya murni menggantikan cara Hook mengelola cache
- [x] **React Query** (E14) — satu-satunya cache data server-side di seluruh app, query key registry terpusat (`hooks/queryKeys.ts`), mutasi invalidate key yang relevan (termasuk lintas halaman)
- [x] **Supabase Realtime sync** (E14) — satu subscriber terpusat (`useRealtimeSync`, dipasang sekali di `AppLayout`) memetakan `postgres_changes` ke invalidation React Query, sehingga perubahan dari tab/user lain otomatis ter-refresh tanpa perlu refresh manual
- [x] PrimeReact + PrimeFlex setup, dark/light/system theme toggle
- [x] Restrukturisasi monorepo (`frontend/` + `backend/` disiapkan untuk migrasi PHP+SQLite)
- [ ] Test suite (Vitest)
- [x] Storage adapter interface (`StorageAdapter`) — implementasi awal `SupabaseStorageAdapter` (bucket private, signed URL), slot disiapkan untuk backend upload internal (E12)

## Reporting (belum diprioritaskan — desain di-skip untuk saat ini)
- [ ] Dashboard interaktif (ringkasan lintas project)
- [ ] Printable report HTML/PDF
- [ ] Execution mode — tampilan sederhana untuk eksekusi test run di HP
