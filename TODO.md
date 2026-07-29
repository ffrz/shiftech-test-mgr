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
