# TODO — Sprint Board Aktif

Titik mulai sesi kerja. Update file ini setiap kali mulai/selesai mengerjakan sesuatu.

## Siap Dikerjakan (next up)

- [ ] **Migrasi database sekarang dikelola via Supabase CLI** (`supabase db push`, terhubung ke project remote lewat `supabase link`) — semua migrasi historis + E12 + E13 sudah tersusun di `supabase/migrations/` (14 file, berurutan) dan sudah dijalankan sukses ke database production setelah reset total (2026-07-22). Migrasi baru berikutnya: tambah file `.sql` baru ke `supabase/migrations/` lalu `supabase db push --yes`
- [ ] Role user perlu di-set ulang manual pasca reset database — lihat `backups/restore_roles.sql` untuk daftar email+role sebelum reset (user lain selain admin pertama belum login ulang)
- [ ] E02-T05 — Project selector/context global
- [ ] E03-T06 — Filter test case by priority/status di list
- [ ] E06-T14 — Status "rejected" terpisah dari "pending" (jika diperlukan)

## Sedang Dikerjakan

_(kosong)_

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
- [x] E13 — Halaman detail test case dalam Test Run (`/test-runs/:runId/results/:resultId`, panel navigasi + filter) menggantikan dialog; Sequence (drag & drop urutan eksekusi) pada Test Plan via `test_plan_cases.order` (2026-07-22)
