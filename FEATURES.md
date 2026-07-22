# FEATURES — Status Checklist

Ringkasan cepat status fitur per modul. Detail task-level ada di [`docs/TASKS.md`](docs/TASKS.md).

## Projects
- [x] List project (DataTable) — search, filter status, sortable
- [x] Create & Edit project (Dialog form)
- [x] Status lifecycle: Aktif / Nonaktif / Arsip (menu aksi per baris)
- [x] Hapus Permanen (dengan konfirmasi, cascade ke module/test plan/test case/test run/test result/issue)
- [x] Halaman detail project (`/projects/:id`) — info + tab Test Plans / Test Cases / Modules / Tags
- [ ] Project selector global (dipakai lintas halaman)

## Kode Entity (Module, Test Case, Test Plan, Test Run)
- [x] Auto-generate `MOD-####`/`TC-####`/`TP-####`/`TR-####` per project (trigger DB, race-safe)
- [x] Selalu bisa diedit manual dari field "Kode" di form masing-masing
- [x] Ditampilkan sebagai kolom di semua tabel terkait + judul halaman detail

## Modules & Tags
- [x] CRUD Module per project (tab "Modules" di Project Detail)
- [x] Tag creatable (dropdown Chips di form Test Case, otomatis buat tag baru per project)
- [x] Tab "Tags" di Project Detail — list, rename, hapus tag yang sudah ada

## Test Cases
- [x] CRUD lengkap per project (tab "Test Cases" di Project Detail): Module, Objective, Preconditions, Steps, Expected Result, Priority, Tags, Notes
- [x] Status `active`/`archived` (arsipkan alih-alih hapus untuk retensi riwayat)
- [x] List lintas project (`TestCasesPage`, read-only, pilih project via dropdown)
- [x] Delete + konfirmasi
- [ ] Filter by priority/status di list

## Test Plans
- [x] CRUD test plan per project (tab "Test Plans" di Project Detail)
- [x] Tab Test Cases: kelola cakupan (tambah/keluarkan test case dari plan — TANPA hasil, hanya cakupan)
- [x] Sequence: drag & drop urutan eksekusi test case (`test_plan_cases.order`) — panduan workflow, bukan pembatas eksekusi (E13)
- [x] Tab Test Runs: mulai run baru, lihat riwayat semua run

## Test Runs & Test Results
- [x] Halaman Test Runs lintas project (`/test-runs`, sidebar) — semua run dari semua plan dalam satu project
- [x] Mulai Test Run baru (snapshot cakupan test case plan saat itu, termasuk urutannya)
- [x] Halaman detail test case dalam run (`/test-runs/:runId/results/:resultId`, E13) — panel navigasi + filter (status/prioritas/module/tag/search), gantikan dialog lama
- [x] Catat hasil per test case: status (pass/fail/skip/blocked), tester (dropdown user terdaftar), catatan
- [x] Ringkasan progress otomatis (pass/fail/skip/blocked/belum dites, persentase)
- [x] Selesaikan Run (manual) / Buka Kembali

## Issue & Feature Tracking v2 (E12)
- [x] Reshape `issues`: level-project (`project_id` wajib, `module_id` nullable), relasi ke Test Result jadi N:M via `issue_test_results`
- [x] Kolom `type` (bug/feature/improvement/task) — sekaligus jadi feature tracking sederhana
- [x] Tag many-to-many ke Issue (`issue_tags`, reuse master Tag)
- [x] Tab Issues di Project Detail + `IssueDetailPage` — direshape untuk model project-level (filter type/status/priority/module/tag, dialog create standalone)
- [x] Dialog "Link Issue" di Test Run (`TestRunDetailPage`): pilih issue existing (checkbox multi) atau buat baru inline tanpa pindah halaman
- [x] Badge jumlah issue tertaut per baris Test Result
- [x] GitHub links (`{url, label?}[]`) — link klik saja, bukan integrasi API, dikelola di dialog Edit Issue
- [x] Attachment via storage adapter — upload/hapus di `IssueDetailPage`

## Test Case — Structured Steps (E12)
- [x] `step_type`: `simple` (teks bebas, seperti sekarang) atau `detailed` (baris `test_case_steps` ternormalisasi, toggle `SelectButton` di form Test Case)
- [x] Hasil per-step (`test_result_steps`) saat Test Run mengeksekusi Test Case `detailed` — checklist pass/fail per step di dialog Catat Hasil

## User Management & Auth (RBAC)
- [x] Login via Google OAuth (Supabase Auth)
- [x] Auto-provisioning profile (role default `pending`) saat signup
- [x] RLS berbasis role (`pending`/`user`/`admin`) di semua tabel
- [x] Halaman Login & Pending Approval
- [x] Route guard (`ProtectedRoute`, `AdminRoute`)
- [x] Halaman User Management: approve, promote/demote admin↔user, cabut akses, hapus (soft-delete), lihat detail
- [x] Halaman detail user (`/users/:id`)
- [x] Layout: avatar, nama user, logout, menu khusus admin, dark mode toggle
- [x] Konfigurasi Google OAuth di Supabase Dashboard — selesai
- [x] Set admin pertama — selesai

## Infrastruktur
- [x] Supabase schema domain + RLS berbasis role (4 file migrasi berurutan)
- [x] Clean architecture layers (Repository/Service/Hook/Component)
- [x] PrimeReact + PrimeFlex setup, dark/light/system theme toggle
- [x] Restrukturisasi monorepo (`frontend/` + `backend/` disiapkan untuk migrasi PHP+SQLite)
- [ ] Test suite (Vitest)
- [x] Storage adapter interface (`StorageAdapter`) — implementasi awal `SupabaseStorageAdapter` (bucket private, signed URL), slot disiapkan untuk backend upload internal (E12)

## Reporting (belum diprioritaskan — desain di-skip untuk saat ini)
- [ ] Dashboard interaktif (ringkasan lintas project)
- [ ] Printable report HTML/PDF
- [ ] Execution mode — tampilan sederhana untuk eksekusi test run di HP
