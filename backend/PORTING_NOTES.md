# Catatan Porting — NvlFr-testify (Node) → backend Go ini

**Dokumen sementara.** Berlaku selama porting MCP server berjalan. Hapus
atau arsipkan setelah `ROADMAP.md` Fase 1-6 selesai dan tidak ada lagi
task yang mengacu ke `NvlFr-testify`.

## Aturan utama

**`NvlFr-testify/` HANYA referensi mekanisme MCP** — pola auth session,
tool registration, governance/rate-limit, cursor pagination, transport
wiring (stdio). **BUKAN sumber kebenaran domain.**

**Sumber kebenaran domain di repo ini:**
- `core/domain.go` + `core/ports.go` — bentuk type Go yang sudah benar
- `supabase/migrations/` (urut timestamp, yang **terbaru** menang) — skema
  tabel sungguhan
- `CLAUDE.md` §Domain Model — aturan bisnis yang tidak boleh dilanggar

Kalau ada bentrok antara apa yang dilihat di kode Node vs domain project
ini: **domain project ini yang menang, selalu.** Jangan menyalin bentuk
data, nama field, atau struktur tabel dari Node begitu saja.

## Kenapa ini perlu ditulis eksplisit

Kedua repo pernah satu garis keturunan tapi sudah divergen:

- **Steps test case**: Node (`writeTools.ts` `caseFields`) pakai `steps: string`
  tunggal (teks bebas). Domain project ini (`core/domain.go` `TestCaseStep`)
  punya struktur `simple`/`detailed` (`StepType`) dengan `TestCaseStep[]`
  (action + expectation per baris) — **beda bentuk total**, bukan sekadar
  rename kolom.
- **Identity**: Node kemungkinan masih pakai `profiles` sebagai satu tabel
  gabungan privat+publik. Project ini sudah split `users` (privat: email,
  role) + `profiles` (publik: username, displayName, avatarUrl, bio) sejak
  Platform Evolution V2 — lihat CLAUDE.md §Auth & RBAC. FK yang di Node
  menunjuk ke `profiles(id)` untuk data privat **harus** dicek ulang,
  kemungkinan besar harus menunjuk ke `users(id)` di project ini.
- **Issue status**: Node punya 8 status (`backlog, open, in_progress,
  resolved, verified, closed, rejected, duplicate` — lihat `readTools.ts`
  baris 111). `core/domain.go` saat ini baru punya 4
  (`IssueOpen/InProgress/Resolved/Closed`) — **jangan otomatis nambah 4
  status Node** ke domain ini tanpa keputusan produk eksplisit; kalau
  project ini memang cuma butuh 4, biarkan tool `issue.updateStatus`
  Go dibatasi ke 4 itu saja, bukan mengikuti Node.
- **Test result status**: ini yang **konsisten** — Node
  (`pass/fail/skip/blocked/not_run`) sama persis dengan `core.TestResultStatus`
  project ini. Contoh kasus yang boleh dipercaya identik, tapi tetap
  **verifikasi dulu**, jangan asumsikan otomatis untuk entity lain.
- **Project visibility/ownership**: fitur V2 (`owner_id`, `owner_type`,
  `visibility`) yang ada di domain project ini kemungkinan **tidak ada**
  di titik waktu skema Node yang dipakai sebagai referensi mekanisme —
  jangan drop field ini saat porting proyek/tool yang menyentuh `Project`.

## Cara pakai referensi Node dengan benar

Saat sebuah task (`TASKS.md`/`VALIDATION.md`) bilang "referensi:
`NvlFr-testify/mcp/src/tools/xxxTools.ts`", yang dimaksud **hanya**:

1. Nama tool & pola penamaan (`testmanager.<domain>.<action>` →
   `testify.<domain>.<action>`)
2. Input apa saja yang diterima tool itu secara konsep (mis. "search
   testcase bisa difilter by module/tag/priority/status/text") — **bukan**
   nama field literal Zod schema-nya kalau beda dari domain project ini
3. Alur logic non-domain: bagaimana auth session dicek, bagaimana
   governance middleware membungkus handler, bagaimana cursor pagination
   di-encode
4. Anotasi tool (`readOnlyHint`, `destructiveHint`, `idempotentHint`) —
   ini konsep MCP protokol, universal, aman ditiru langsung

**Yang TIDAK boleh ditiru langsung:**
- Bentuk/nama kolom database — selalu cek `supabase/migrations/` project
  ini dulu
- Bentuk response JSON per field — turunkan dari `core/domain.go`, bukan
  dari `types/domain.ts` Node
- Daftar enum (status, priority, dll) — kalau project ini punya set enum
  berbeda, itu yang dipakai

## Sebelum menulis kode porting apa pun

1. Cek `core/domain.go` — apakah type-nya sudah ada? Kalau sudah, itu
   bentuknya, titik.
2. Kalau belum ada type-nya, cek `supabase/migrations/` (timestamp
   terbaru untuk tabel terkait) untuk tahu kolom sungguhan sebelum
   menambah type baru ke `core/domain.go`.
3. Baru setelah dua hal itu jelas, lihat kode Node **hanya** untuk pola
   mekanisme (poin 1-4 di atas).
4. Kalau ragu apakah suatu perbedaan Node vs domain ini disengaja atau
   cuma drift lama yang belum di-cleanup — **tanyakan**, jangan
   tebak/asumsikan salah satu benar.

## Dampak ke dokumen lain

`TASKS.md` dan `VALIDATION.md` yang sudah ditulis sebagian masih
memformulasikan referensi Node dengan nada "port field ini" (terutama
T2.1 `TestCaseRepo` yang eksplisit menyebut ambiguitas steps — sudah
benar hati-hati di situ, jadi pola penulisan itu yang harus diikuti untuk
semua task lain juga). Saat mengerjakan task manapun dari kedua dokumen
itu, terapkan aturan di dokumen ini sebagai lapisan tambahan di atasnya —
dokumen ini menang kalau terasa bentrok dengan kalimat spesifik di
`TASKS.md`.
