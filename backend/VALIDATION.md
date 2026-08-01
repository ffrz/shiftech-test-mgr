# Backend Go — Validation Spike (bukti arsitektur bekerja)

> **Status: ✅ S1-S5 selesai — 2026-08-01.** Arsitektur terbukti bekerja
> end-to-end, termasuk transport HTTP untuk deploy VPS (S5, ditambahkan
> setelah ditemukan bahwa stdio-only tidak cocok untuk deployment
> terpusat — lihat §Hasil S5). Lihat §Hasil di bagian bawah dokumen ini
> sebelum melanjutkan ke `ROADMAP.md` Fase 1+.

**Tujuan dokumen ini beda dari `BACKLOG.md`/`ROADMAP.md`/`TASKS.md`.**
Dokumen-dokumen itu adalah rencana lengkap porting 42 MCP tools + REST API
penuh. Dokumen ini adalah **jalur tercepat** untuk membuktikan satu hal
saja: *apakah shared-core architecture (`core/` + `repository/postgres/`
dipakai dua transport berbeda) benar-benar bisa hidup dan diuji end-to-end*.

Tidak menyelesaikan semua tool, tidak menyelesaikan REST API penuh. Cukup
**satu jalur vertikal utuh** di tiap transport, memakai repository yang
sama, untuk membuktikan boundary-nya benar sebelum invest waktu porting 42
tool.

Setelah spike ini hijau, lanjutkan ke `ROADMAP.md` Fase 1+ untuk cakupan
penuh — jangan bongkar ulang keputusan yang sudah dibuktikan di sini.

---

## Kenapa `project.list` / `GET /projects` yang dipilih

`core.ProjectRepository` + `repository/postgres/project_repo.go` **sudah
ada dan sudah diperbaiki** (lihat `WORKLOG.md` 2026-08-01 — bug tipe
timestamp & mapping sudah di-fix, `go build`/`go vet` bersih). Ini satu-
satunya repository yang sudah matang, jadi tidak perlu menulis repository
baru untuk membuktikan arsitektur — cukup pasang dua transport tipis di
atasnya.

`List`/`Get` juga tidak butuh write-tools, governance middleware, atau
tabel baru selain `api_tokens` (untuk auth MCP) — scope paling kecil yang
masih genuinely membuktikan pola end-to-end (auth → repo → transport →
respons ke client sungguhan).

## Definisi "selesai" untuk spike ini

1. MCP: jalankan `mcp-server` sungguhan (stdio), panggil tool
   `testify.project.list` dari MCP client asli (Claude Desktop/Code atau
   `mcp-go` test client), dapat balik daftar project real dari database.
2. REST: jalankan `rest-api` sungguhan (HTTP), `curl GET /projects` dapat
   balik JSON array project yang sama persis (mapping/data konsisten
   dengan hasil MCP di atas — bukti kedua transport benar-benar reuse
   repository yang sama, bukan dua implementasi terpisah yang kebetulan
   mirip).
3. Tidak ada write tool, tidak ada governance/rate-limit, tidak ada auth
   JWT REST — semua itu di luar scope spike, sengaja diabaikan dulu.

Begitu tiga poin di atas tercapai, laporkan hasilnya (sukses/gagal + apa
yang ditemukan) sebelum lanjut ke roadmap penuh.

---

## Task (urutan wajib, S1 → S2 → S3 → S4)

### S1 — Migration `api_tokens` (blocker MCP, prasyarat S2)

Sama persis dengan `TASKS.md` T1.1 — **jangan duplikasi keputusan desain**,
ikuti spek di sana:

- File baru: `supabase/migrations/<timestamp>_backend_api_tokens.sql`
- Referensi skema: `../../NvlFr-testify/supabase/schema_019_p2_api_webhooks.sql`
  baris 8-20 (bagian `api_tokens` saja)
- `scopes text[]` (Postgres array, **bukan** CSV/jsonb) — sudah dikonfirmasi
  cocok dengan `repository/postgres/token_repo.go` yang sudah pakai
  `pq.StringArray`
- FK `project_id references projects(id) on delete cascade`
- FK pembuat token: pakai `profiles(id)`, **bukan** `users(id)` — lihat
  CLAUDE.md §Auth & RBAC soal split identity project ini (beda dari
  referensi Node yang mungkin masih single table `profiles`)
- **Skip dulu:** rate-limit table (`mcp_tool_rate_limits`), audit table —
  itu `TASKS.md` T1.2, di luar scope spike ini

**Acceptance S1:**
- `supabase db push --yes` sukses
- Insert manual 1 row via SQL editor: token dummy dengan
  `scopes = array['read:project']`, `project_id` = salah satu project
  yang sudah ada di database, hash SHA-256 dari string token bebas (mis.
  `tm_` + 64 hex karakter, cocok pola `TokenRepo.Authenticate` di
  `token_repo.go`)
- Catat raw token yang dipakai (sebelum di-hash) di tempat aman — dibutuhkan
  untuk S2 sebagai `TM_API_TOKEN`

### S2 — MCP: satu tool `testify.project.list`, wiring stdio nyata

**File yang diubah:**
- `go.mod` — tambah `github.com/mark3labs/mcp-go`
- `mcp-server/cmd/main.go` — ganti placeholder (baris ~58-64: `fmt.Println`
  + `_ = registrars`) dengan wiring `mcp-go` sungguhan
- `mcp-server/internal/tools/read_tools.go` — implementasikan **hanya**
  `testify.project.list` (fungsi `listProjects` contoh sudah ada di baris
  44-54, tinggal disambungkan ke `Register()` yang saat ini return `nil`
  di baris 41)

**Referensi tool:** `../../NvlFr-testify/mcp/src/tools/readTools.ts` baris
16-23 (`testmanager.project.list`) — paling sederhana, tanpa filter/input
sama sekali (`inputSchema: {}`).

**Sengaja diabaikan di spike ini** (jangan dikerjakan, di luar scope):
- Governance/rate-limit middleware (`TASKS.md` T4.2)
- Project-scope recursive guard (`TASKS.md` T4.3) — session sudah cukup
  cek `TM_PROJECT_ID` match di `auth.Load()` yang sudah ada
- Tool lain (`project.get`, `testcase.search`, dst)
- Cursor pagination — `project.list` di Node juga tidak dipaginate

**Acceptance S2:**
- `go build ./...` bersih
- `TM_API_TOKEN=<raw token dari S1> TM_PROJECT_ID=<uuid project> go run ./mcp-server/cmd`
  start tanpa crash, menunggu koneksi stdio
- Tool `testify.project.list` terdaftar dan bisa dipanggil dari MCP
  client asli, hasil JSON berisi project yang project_id-nya match
  `TM_PROJECT_ID`

### S3 — REST: scaffold Echo + satu endpoint `GET /projects`

**File baru:**
- `rest-api/cmd/main.go` — entry point: connect DB (reuse pola
  `gorm.Open(pgdriver.Open(dsn), ...)` dari `mcp-server/cmd/main.go`,
  jangan tulis ulang dari nol) → wire `postgres.NewProjectRepo(db)` →
  Echo server → serve HTTP
- `rest-api/internal/handler/project_handler.go` — handler tipis:
  parsing request → panggil `core.ProjectRepository.List()` → serialize
  JSON. **Tidak ada business logic di sini**, sama seperti aturan transport
  MCP di `ARCHITECTURE.md` prinsip #4

**File yang diubah:**
- `go.mod` — tambah `github.com/labstack/echo/v4`
- `rest-api/README.md` — update dari "akan datang" jadi status spike aktif

**Sengaja diabaikan di spike ini:**
- Auth JWT/Google — endpoint ini **tanpa auth** untuk spike (catat ini
  jelas di kode/komentar sebagai TODO, supaya tidak lupa sebelum deploy
  sungguhan)
- Endpoint lain (`POST /projects`, testcase, dst)
- Error handling lengkap — cukup 500 generik untuk error tak terduga

**Acceptance S3:**
- `go run ./rest-api/cmd` start HTTP server (pilih port bebas, mis. 8081,
  supaya tidak bentrok dengan Vite dev server 5173 dan Supabase local)
- `curl http://localhost:8081/projects` return JSON array project,
  field `id`/`name`/`status`/`visibility`/`ownerId` sesuai `core.Project`
  (`json` tag di `core/domain.go` baris 25-34)

### S4 — Bukti reuse: bandingkan hasil MCP vs REST

Bukan file kode — ini langkah verifikasi manual/laporan.

- Jalankan S2 dan S3 terhadap database yang sama
- Bandingkan hasil `testify.project.list` (MCP) vs `GET /projects` (REST)
  — harus identik (kecuali S2 difilter oleh `TM_PROJECT_ID` scope, S3
  tidak difilter karena belum ada auth; catat perbedaan ini eksplisit di
  laporan, jangan anggap "sama" begitu saja kalau scope-nya beda)
- Tulis hasil temuan singkat (sukses/gagal, bug yang ditemukan, apakah
  boundary `core/`+`repository/postgres/` benar-benar tidak bocor
  pengetahuan transport-specific) sebagai balasan ke task ini — **bukan**
  file dokumentasi baru, cukup laporan ke pemberi tugas

---

## Hasil (2026-08-01)

Semua task S1-S4 dikerjakan dan diverifikasi langsung (bukan didelegasikan),
terhadap database Supabase project ini yang sesungguhnya (bukan mock/local).

**S1 — Migration `api_tokens`:** `supabase/migrations/20260801131633_backend_api_tokens.sql`
di-push sukses via `supabase db push --yes`. Token dummy berhasil di-insert
(`scopes` tersimpan sebagai Postgres `text[]` asli, terbukti lewat query
langsung, bukan cuma asumsi skema).

**S2 — MCP `testify.project.list`:** `mark3labs/mcp-go` di-wire penuh di
`mcp-server/cmd/main.go` (stdio transport via `server.ServeStdio`).
Tool diimplementasikan di `mcp-server/internal/tools/read_tools.go`,
`ToolRegistrar.Register` diubah dari `Register(interface{})` jadi
`Register(*server.MCPServer)` (perbaikan tipe, `registry.go`). Dites end-to-
end dengan mengirim JSON-RPC (`initialize` → `tools/list` → `tools/call`)
langsung ke stdin binary yang di-build — **bukan cuma `go build` lulus**.
Hasil: 10 project asli ter-return dengan mapping domain benar (`id`, `name`,
`status`, `visibility`, `ownerId`, `createdAt`/`updatedAt` — field timestamp
inilah yang sempat rusak di Fase 0, sekarang terbukti benar di respons
sungguhan, bukan cuma lolos compile).

**Bug ditemukan & diperbaiki selama S2:** tool annotation salah
(`readOnlyHint: false, destructiveHint: true` untuk tool read-only, akibat
tidak eksplisit di-set) dan `content[0].text` kosong (`NewToolResultStructured`
butuh `fallbackText` non-kosong). Kedua fix ada di `read_tools.go`, sudah
diverifikasi ulang setelah fix — annotation sekarang benar.

**S3 — REST `GET /projects`:** `rest-api/cmd/main.go` + `rest-api/internal/handler/project_handler.go`
baru, pakai Echo, reuse `postgres.NewProjectRepo(db)` — **konstruktor
repository yang sama persis** dengan yang dipakai MCP di S2, tidak ada kode
repository baru ditulis untuk REST. Dites dengan menjalankan server
sungguhan + `curl http://localhost:8081/projects` — 10 project yang sama
ter-return.

**S4 — Perbandingan:** project `182ac366-a561-4718-aeed-b2c61fda1f33`
("My Project") muncul identik di kedua transport (nama, status, visibility,
ownerId, timestamp — semua field cocok byte-for-byte). Ini membuktikan
`core/` + `repository/postgres/project_repo.go` benar-benar dipakai bersama
tanpa duplikasi logic, sesuai prinsip #4 `ARCHITECTURE.md`. Perbedaan yang
diharapkan: REST belum di-scope oleh project/token manapun (semua 10
project ter-return, karena belum ada auth — sesuai rencana, bukan bug) vs
MCP yang secara teknis scoped ke satu `TM_PROJECT_ID` tapi
`ProjectRepo.List` sendiri belum menerapkan filter itu di query (`Registry`
punya `Session.ProjectID` tapi `listProjects` di `read_tools.go` belum
memakainya sebagai filter — **sudah diperbaiki di S5** di bawah, sekalian
dengan pekerjaan transport HTTP, karena keduanya menyentuh file yang sama).

## S5 — Transport HTTP untuk MCP (ditambahkan setelah S1-S4)

**Kenapa ditambahkan:** setelah S1-S4 selesai, muncul pertanyaan user yang
mengungkap kesalahan asumsi — MCP server yang dibangun (`mcp-server/cmd`)
pakai **stdio transport**, yang mengharuskan client men-*spawn* proses
server sebagai child process **di mesin yang sama**. Itu cocok untuk dev
lokal, tapi **tidak cocok** untuk tujuan sebenarnya: server terpusat di
VPS yang diakses banyak AI agent dari mana saja lewat internet. Referensi
`NvlFr-testify` juga stdio-only (lihat `mcp/README.md` — "berbasis
Node.js, transport stdio", tidak ada mode server terpusat) — jadi
kesalahan ini "ketularan" dari pola referensi tanpa dipertanyakan dulu.

**Yang dikerjakan:**
- `mcp-server/internal/auth/session.go`: tambah `LoadFromToken` (auth dari
  raw token string + project ID langsung, bukan baca env var) dan
  `WithSession`/`FromContext` (attach/retrieve `Session` lewat
  `context.Context`). `Load` (versi env var) **tidak dihapus** — tetap
  dipakai `cmd` (stdio).
- `mcp-server/internal/tools/registry.go`: `Registry.Session` sekarang
  opsional; tambah `SessionFor(ctx)` yang cek context dulu (mode HTTP),
  fallback ke `Registry.Session` (mode stdio) — satu tool handler bekerja
  di kedua mode tanpa tahu transport mana yang aktif.
- `mcp-server/internal/tools/read_tools.go`: `listProjects` sekarang
  panggil `SessionFor(ctx)` dan **benar-benar memfilter** hasil ke
  `session.ProjectID` (memperbaiki gap yang dicatat di S4 di atas).
- `mcp-server/cmd-http/main.go` **(baru)** — entry point kedua,
  StreamableHTTP (`server.NewStreamableHTTPServer`, endpoint `POST /mcp`).
  Auth per-request lewat `HTTPContextFunc`: baca header
  `Authorization: Bearer <token>` + `X-Testify-Project-Id: <uuid>`,
  autentikasi, attach `Session` ke context request itu. `cmd/main.go`
  (stdio) **tidak diubah/dihapus** — sesuai keputusan eksplisit: dua entry
  point terpisah untuk dua skenario, bukan satu kode yang di-branch.

**Verifikasi:**
- `go build ./...` + `go vet ./...` bersih untuk kedua entry point
- Stdio (`cmd`) dites ulang setelah refactor `Registry` — tetap jalan,
  DAN sekarang ter-scope benar ke 1 project (bukan 10 seperti S2 awal)
- HTTP (`cmd-http`) dites end-to-end murni pakai `curl` dari luar proses
  server (bukan spawn lokal): `initialize` → dapat `Mcp-Session-Id` dari
  response header → `tools/call` dengan header `Mcp-Session-Id` +
  `Authorization` + `X-Testify-Project-Id` → hasil 1 project yang benar,
  identik bentuknya dengan hasil stdio
- Negative case: `tools/call` tanpa header auth → ditolak dengan
  `"no session available for this call"` (`isError: true`), bukan bocor
  data atau crash

**Kesimpulan S5:** kedua transport MCP (stdio untuk dev lokal, HTTP untuk
deploy VPS) terbukti reuse tool handler yang sama persis tanpa duplikasi
logic — perbedaannya murni di cara `Session` diperoleh (env var sekali vs
header per-request), persis pola yang sudah dibuktikan `core/`+
`repository/postgres/` di S1-S4. Cara pakai lengkap ada di `RUNNING.md`
§Menjalankan MCP Server via HTTP.

**Belum masuk scope S5** (di luar validasi arsitektur, redirect ke
`TASKS.md`/`BACKLOG.md` Epic 4): rate-limit per token, audit trail, CORS
untuk client browser-based, TLS (didelegasikan ke reverse proxy saat
deploy, bukan built-in di `cmd-http`).

## S6 — Isolasi per-user pada MCP token (ditambahkan setelah S5)

**Kenapa ditambahkan:** setelah S5, muncul pertanyaan apakah MCP perlu
"login per user" seperti REST API. Opsi awal yang dipertimbangkan (token
terikat ke `user_id`, otomatis akses **semua** project milik user itu)
**ditolak** setelah didiskusikan — blast radius kebocoran token jadi
terlalu luas (satu token bocor = semua project user itu ter-expose,
termasuk project org lain yang dia cuma anggota), dan tidak match pola
pemakaian AI agent yang biasanya digunakan untuk satu project pada satu
waktu. Diputuskan: tetap token per-project (model lama), tapi tambah
**validasi keanggotaan real-time**.

**Yang dikerjakan:**
- `repository/postgres/token_repo.go`: `apiTokenRow` tambah field
  `CreatedBy` (kolom `created_by` sudah ada di tabel sejak S1, belum
  di-map sebelumnya). `Authenticate` sekarang, setelah token match,
  memanggil `creatorHasProjectAccess(createdBy, projectID)` — query yang
  mencerminkan **persis** aturan RLS frontend
  (`has_project_access()` di `supabase/migrations/20260725000004_remove_admin_bypass_project_access.sql`):
  `owner_id = created_by` **OR** ada row `project_members` dengan
  `status = 'accepted'`. Kalau tidak lolos, return `ErrProjectAccessRevoked`
  (bukan `ErrInvalidToken` — pesan beda supaya jelas ini soal akses
  project, bukan token rusak).
- Efek: token API tidak lagi "hidup selamanya sampai di-revoke manual" —
  begitu pembuat token di-remove dari project (row `project_members`
  dihapus/`declined`) atau ownership project dipindah, token itu
  **otomatis berhenti berfungsi untuk project itu di request berikutnya**,
  tanpa langkah revoke terpisah.

**Verifikasi:** dites end-to-end dengan dua skenario via `curl` ke
`cmd-http` (port 8082):
- Token dari `created_by` yang **masih** owner project → tetap lolos,
  hasil sama seperti sebelumnya
- Token dibuat dengan `created_by` = profil yang **bukan** owner dan
  **bukan** member accepted project itu (di-seed langsung ke DB untuk
  simulasi) → ditolak dengan `"no session available for this call"`
  (`isError: true`) — sama seperti kasus tanpa token sama sekali, tidak
  bocor project apa pun

**Kesimpulan S6:** isolasi MCP sekarang setara dengan isolasi RLS
Supabase yang sudah dipakai frontend — sumber kebenaran akses yang sama
(`project_members`/`owner_id`), dicek ulang tiap request, bukan cuma
snapshot saat token dibuat. Tidak ada migration skema baru yang
dibutuhkan (kolom `created_by` sudah ada sejak S1) — perubahan murni di
query `TokenRepo.Authenticate`.

**Kendala operasional yang dipecahkan (dicatat untuk referensi task lain
yang butuh `DATABASE_URL`):** direct connection Supabase
(`db.<ref>.supabase.co:5432`) IPv6-only dan tidak reachable dari mesin
Windows ini (tidak ada rute IPv6 keluar). Solusinya: pakai **Session
pooler** (`postgres.<ref>@aws-1-ap-northeast-2.pooler.supabase.com:5432`,
bukan Transaction pooler port 6543 — nomor `aws-N` region tidak bisa
ditebak, harus diambil dari dashboard Supabase). `DATABASE_URL` final
disimpan di `backend/.env` (gitignored, tidak pernah di-commit).

**Kesimpulan:** shared-core architecture (`core/domain.go` + `core/ports.go`
+ `repository/postgres/` dipakai dua transport berbeda tanpa modifikasi)
**terbukti bekerja**. Aman melanjutkan ke `ROADMAP.md` Fase 1+ untuk cakupan
penuh 42 tool + REST API lengkap.

---

## Yang TIDAK masuk spike ini (redirect ke dokumen lain)

Kalau tergoda mengerjakan salah satu ini "sekalian", **jangan** — itu scope
`BACKLOG.md`/`ROADMAP.md`/`TASKS.md`, dikerjakan setelah spike ini
membuktikan arsitekturnya sehat:

- Write tools apa pun (`testcase.create`, dst)
- Governance/rate-limit/audit trail
- Tool automation/analysis/repo/requirement
- Auth REST (JWT/Google)
- Tabel migration selain `api_tokens`
- Cursor pagination generik

## Urutan dependency

```
S1 (migration api_tokens)
  └──► S2 (MCP tool) ──┐
  └──► S3 (REST endpoint) ──┤──► S4 (bandingkan + laporan)
```

S2 dan S3 independen satu sama lain setelah S1 selesai — bisa dikerjakan
2 agen paralel. S4 menunggu keduanya.
