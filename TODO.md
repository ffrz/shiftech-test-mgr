# TODO — Sprint Board Aktif

Titik mulai sesi kerja. Update file ini setiap kali mulai/selesai mengerjakan sesuatu.

## Siap Dikerjakan (next up)

- [ ] E02-T05 — Project selector/context global
- [ ] E03-T06 — Filter test case by priority/status di list
- [ ] E06-T14 — Status "rejected" terpisah dari "pending" (jika diperlukan)
- [ ] Cek ulang: apakah role user lain (selain admin pertama) sudah login ulang & di-set sesuai `backups/restore_roles.sql`? Dibuat saat reset database 2026-07-22, kemungkinan sudah selesai tapi belum dikonfirmasi
- [ ] Reporting (Dashboard/PDF/HTML/execution mode mobile) — belum diprioritaskan, lihat `docs/PRD.md` §7 Roadmap

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
- [x] E13 — Sequence (drag & drop urutan eksekusi) pada Test Plan via `test_plan_cases.order`, diwariskan ke Test Run saat dimulai (2026-07-22)
- [x] E15 — RBAC per-project (`project_members`, role `manager`/`supervisor`/`tester`/`member`) — independen dari role global `user`/`admin` (2026-07-22)
- [x] E14.1 — Gabung halaman list+detail Test Run jadi satu komponen (`TestRunResultDetailPage`, item terpilih via `?resultId=`) — fix bug breadcrumb kosong sesaat akibat React Router remount; ganti Link Issue dari inline tab jadi Browse Issues (paginated) + Create dialog bertingkat; beberapa polish UI (summary selalu terlihat, filter collapsible, nomor urut, Prev/Next pinned, status "Belum Dites", link ke test case asli, info modul/tag/tester di detail) (2026-07-22)
- [x] E14.2 — Migrasi seluruh app dari `useState`+`useEffect` manual ke React Query (`hooks/queryKeys.ts` sebagai registry key terpusat) — memperbaiki bug utama: menyelesaikan Test Run dari halaman detailnya tidak lagi butuh refresh manual untuk terlihat update di tab "Test Runs" `ProjectDetailPage` (2026-07-22)
- [x] E14.3 — Supabase Realtime sync (`useRealtimeSync`, satu subscriber terpusat di `AppLayout`) — perubahan dari user/tab browser lain juga otomatis ter-refresh, bukan cuma lintas halaman di sesi yang sama (2026-07-22)
