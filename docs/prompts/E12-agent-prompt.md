# Prompt untuk Agen — Epic E12: Issue & Feature Tracking v2, Structured Test Case Steps, Attachment Adapter

Salin seluruh isi file ini sebagai instruksi awal ke sesi agen baru.

---

## Konteks Proyek

**TestManager** (`shiftech-test-mgr`) adalah aplikasi internal manajemen Test
Plan/Test Case. Stack: React 19 + TypeScript (Vite, SPA murni, tanpa
backend/SSR) + PrimeReact 10 (UI) + Supabase (Postgres BaaS untuk data, auth,
storage). Arsitektur wajib berlapis:

```
Component/Page → Hook → Service (business logic) → Repository (raw query) → Supabase
```

**JANGAN PERNAH skip layer** (Page memanggil Repository langsung, atau
Component memanggil Supabase langsung). Baca **`CLAUDE.md`** di root repo dulu
sebelum menyentuh kode apa pun — dokumen itu berisi seluruh konvensi wajib
(naming, PageHeader, urutan pembuatan modul, dll).

## Tugas Kamu

Kamu mengerjakan **Epic E12** — reshape modul Issue jadi entity level-project
dengan relasi N:M ke Test Result (sebelumnya Issue wajib anak satu Test
Result), tambah mode "structured steps" per Test Case, dan siapkan storage
adapter untuk attachment. Ini hasil brainstorming produk yang sudah final —
**jangan mendesain ulang dari nol**, ikuti keputusan yang sudah tertulis di
dokumen berikut (baca semua sebelum mulai coding):

1. **`docs/PRD.md`** §3 (bagian Test Case, Issue, Attachment) — rationale
   produk, apa yang berubah dan kenapa
2. **`docs/ARCHITECTURE.md`** §4 (tabel skema database, cari baris bertanda
   "rencana, E12" / "reshape E12") dan **§6.6** — flow teknis lengkap: halaman
   baru, dialog Link Issue, storage adapter
3. **`docs/TASKS.md`** §**E12** — daftar 33 task bernomor (E12-T01 s/d T33),
   dikelompokkan E12.1 Schema → E12.2 Domain Types & Mapper → E12.3 Repository
   & Service → E12.4 Hooks & UI. **Ini adalah daftar tugas kamu yang
   sebenarnya** — kerjakan berurutan per grup, update status `todo` →
   `done` di file itu setiap task selesai.
4. **`FEATURES.md`** — checklist status fitur, centang item terkait E12 saat
   sudah selesai & terverifikasi jalan
5. **`TODO.md`** — sprint board aktif, pindahkan item E12 dari "Siap
   Dikerjakan" ke "Selesai" kalau seluruh epic tuntas

## Keputusan Desain yang SUDAH FINAL (jangan tanya ulang ke user, jangan ubah)

- **Issue**: entity level-**project** (`project_id` wajib), `module_id`
  **nullable**, tag **many-to-many** (junction `issue_tags`, reuse tabel
  `tags` yang sama dengan Test Case — bukan tabel tag terpisah)
- **Issue ↔ Test Result**: relasi **N:M** lewat junction `issue_test_results`
  — bukan lagi FK `test_result_id` wajib di tabel `issues`. Kolom
  `issues.test_result_id` versi lama **dihapus** setelah migrasi data
- **Issue.type**: enum tetap (check constraint) `bug | feature | improvement
  | task` — bukan master data/tabel terpisah
- **Issue.github_links**: kolom `jsonb`, array `{url, label?}` — sekadar link
  yang bisa diklik, **tidak ada** panggilan API GitHub sama sekali
- **Test Case step mode**: kolom `test_cases.step_type` (`simple` default |
  `detailed`). Mode `detailed` → baris di tabel `test_case_steps` (step_number,
  action, expected_result). Saat Test Run dimulai, tiap step dari test case
  `detailed` dalam cakupan ikut di-seed ke `test_result_steps` (status
  `pass`/`fail` sederhana + actual_result), pola seeding-nya **mirror**
  `testRunService.start()` yang sudah ada untuk `test_results`
- **Attachment**: lewat **storage adapter** (interface `StorageAdapter` di
  `services/storage/`), implementasi awal `SupabaseStorageAdapter` (Supabase
  Storage, gratis, tanpa dependency baru). Disiapkan slot untuk adapter
  backend internal di masa depan — **jangan hardcode** panggilan Supabase
  Storage langsung di service/component, selalu lewat interface
- **Reporting (dashboard/PDF/HTML/execution mode mobile)**: **DI LUAR SCOPE
  epic ini**, sengaja di-skip. Jangan implementasikan, jangan buat
  struktur data untuk itu kecuali diminta eksplisit

## Batasan & Cara Kerja

- **Migrasi skema**: tulis sebagai file SQL baru di `supabase/` (jangan edit
  file migrasi lama yang sudah `done`), urutan nama sesuai
  `docs/ARCHITECTURE.md` §4 (item 6/7/8: `schema_issue_tracking_v2.sql`,
  `schema_test_case_steps.sql`, `schema_attachments.sql`). File-file ini
  **tidak auto-run** — user yang menjalankan manual di Supabase SQL Editor,
  jadi tulis SQL yang idempotent (`if not exists`, dll) mengikuti gaya
  file-file schema yang sudah ada
- **RLS**: setiap tabel baru wajib pakai policy `is_approved()` mengikuti pola
  tabel domain lain — lihat contoh di `schema_test_management_v2.sql`
- **Konvensi kode**: Supabase columns `snake_case`, domain types `camelCase`,
  mapping HARUS lewat `frontend/src/helpers/mappers.ts` — jangan mapping
  manual di tempat lain
- **UI**: halaman list wajib pakai `<PageHeader>` (lihat CLAUDE.md), ikuti pola
  tab/halaman existing (mis. tab Modules/Tags di `ProjectDetailPage` sebagai
  referensi untuk halaman Issue baru)
- **Jangan buat fitur di luar scope** — tidak ada versioning test case,
  tidak ada notifikasi, tidak ada permission granular, dll (lihat §Out of
  Scope di `docs/PRD.md`)
- Setelah selesai satu grup task (mis. semua E12.1), jalankan `npm run build`
  dan `npm run lint` di folder `frontend/` untuk memastikan tidak ada error
  sebelum lanjut ke grup berikutnya
- Kalau menemukan ambiguitas yang **tidak** terjawab oleh PRD/ARCHITECTURE/
  TASKS (mis. detail UX kecil), putuskan sendiri secara masuk akal mengikuti
  pola modul lain yang sudah ada di codebase ini — jangan berhenti untuk
  bertanya kecuali benar-benar blocking (keputusan skema/breaking change yang
  tidak tercakup dokumen)

## Definisi Selesai

- Semua 33 task E12 di `docs/TASKS.md` berstatus `done`
- `FEATURES.md` checklist item E12 tercentang
- `TODO.md` — item E12 dipindah ke "Selesai"
- Build & lint frontend lolos tanpa error
- Flow utama sudah dicoba manual: create issue standalone, link issue dari
  Test Run (baik pilih existing maupun buat baru inline), toggle Test Case ke
  `detailed` lalu catat hasil per step, upload attachment ke issue
