# Worklog

## 2026-08-01

- Backend Go di-reset: stale code dipindah ke `backend_archive/`, scaffold
  shared-core architecture baru (`core/domain` + `core/ports` +
  `repository/postgres` + `mcp-server/`). Lihat `backend/ARCHITECTURE.md`.
- Validasi scaffold backend: ditemukan & diperbaiki bug kompilasi (import
  collision `postgres` di `mcp-server/cmd/main.go`) + mismatch tipe
  timestamp (`string` → `time.Time`) di `project_repo.go`/`token_repo.go`
  + `api_tokens.scopes` disamakan ke `pq.StringArray` (`text[]`) sesuai
  skema referensi `NvlFr-testify`. `go build ./...` dan `go vet ./...`
  sekarang bersih.
- Dibuat `backend/BACKLOG.md`, `backend/ROADMAP.md`, `backend/TASKS.md` —
  breakdown fitur/fase/task siap eksekusi multi-agen untuk porting MCP
  server dari `NvlFr-testify` (TypeScript, 42 tools/5 grup) ke shared-core
  Go. Setiap task mereferensikan file sumber di project referensi secara
  eksplisit.
- Dibuat `backend/PORTING_NOTES.md` (sementara, berlaku selama porting):
  `NvlFr-testify` hanya referensi mekanisme MCP (auth, tool registration,
  governance), **bukan** sumber domain — domain project ini
  (`core/domain.go` + `supabase/migrations/` + CLAUDE.md) selalu menang
  kalau bentrok. Dicatat perbedaan konkret: steps test case (teks tunggal
  vs terstruktur simple/detailed), identity (`profiles` tunggal vs split
  `users`/`profiles`), issue status (8 status Node vs 4 di domain ini).
- Dibuat & dieksekusi `backend/VALIDATION.md` — spike tercepat untuk
  membuktikan shared-core architecture bekerja end-to-end, dikerjakan
  langsung (bukan didelegasikan): migration `api_tokens` di-push ke
  Supabase live, MCP tool `testify.project.list` (wiring `mark3labs/mcp-go`
  stdio penuh) dan REST endpoint `GET /projects` (Echo, `rest-api/`) sama-
  sama reuse `repository/postgres/project_repo.go` yang sama persis, dites
  end-to-end terhadap database sungguhan (bukan mock) — hasil identik di
  kedua transport. **Kesimpulan: arsitektur terbukti bekerja**, aman
  lanjut ke `ROADMAP.md` Fase 1+. Ditemukan & diperbaiki: tool annotation
  MCP yang salah, `content[0].text` kosong. Dicatat solusi koneksi DB dari
  mesin ini (direct connection IPv6-only tidak reachable, harus pakai
  Session pooler Supabase) untuk referensi task berikutnya.
- Ditemukan kesalahan asumsi arsitektur: MCP server yang dibangun
  (`mcp-server/cmd`) pakai **stdio transport**, yang mengharuskan client
  menjalankan proses server sebagai child process di mesin yang sama —
  tidak cocok untuk tujuan sebenarnya (server terpusat di VPS, diakses
  banyak AI agent lewat internet). Pola ini "ketularan" dari referensi
  `NvlFr-testify` yang juga stdio-only, dipakai tanpa dipertanyakan dulu.
  Ditambahkan `mcp-server/cmd-http/` — entry point kedua pakai
  StreamableHTTP (`mark3labs/mcp-go`), auth per-request lewat header
  (`Authorization`/`X-Testify-Project-Id`, bukan env var startup seperti
  stdio). `mcp-server/internal/auth/session.go` dan `.../tools/registry.go`
  direfactor supaya satu tool handler (`read_tools.go`) bekerja di kedua
  mode (`Registry.SessionFor(ctx)` — context untuk HTTP, field untuk
  stdio) tanpa duplikasi logic. `cmd/main.go` (stdio) tidak diubah/dihapus
  — dua entry point terpisah untuk dua skenario pemakaian berbeda (dev
  lokal vs deploy VPS), sesuai keputusan eksplisit. Dites end-to-end murni
  via `curl` (bukan spawn lokal): `initialize` → `tools/call` dengan
  header auth → hasil benar; tanpa header auth → ditolak jelas, bukan
  bocor data. Detail lengkap di `backend/VALIDATION.md` §S5,
  cara pakai di `backend/RUNNING.md`.
- Diskusi isolasi "per user" untuk MCP token: opsi awal (token terikat
  `user_id`, otomatis akses semua project user itu) **ditolak** setelah
  dipertimbangkan — blast radius kebocoran token terlalu luas, tidak match
  pola pemakaian AI agent per-project. Diputuskan tetap token per-project,
  tapi `repository/postgres/token_repo.go` `Authenticate` sekarang
  memvalidasi ulang **setiap request** apakah `created_by` token itu masih
  owner/member (`status='accepted'`) project yang di-scope — mencerminkan
  persis RLS `has_project_access()` frontend. Efek: revoke akses project
  (project_members dihapus/ownership pindah) otomatis mematikan token
  terkait, tanpa revoke manual terpisah. Dites end-to-end: token dari user
  yang masih punya akses tetap lolos; token dari user yang di-seed tanpa
  akses project ditolak jelas (`isError: true`), tanpa bocor data. Detail
  di `backend/VALIDATION.md` §S6. Belum ada migration skema baru — kolom
  `created_by` sudah ada sejak S1.
- Isolasi REST API (`GET /projects`, saat ini benar-benar tanpa auth,
  return semua project semua user) **ditahan dulu** atas permintaan user —
  perlu keputusan dulu apakah modelnya JWT Supabase (konsisten dengan RLS
  yang sudah ada) atau API token seperti MCP, sebelum dikerjakan.
