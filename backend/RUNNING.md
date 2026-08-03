# Cara menjalankan backend Go (mcp-server & rest-api)

MCP server sudah lengkap (`backend/ROADMAP.md` Fase 0-5.5 done — semua
entity Testing Domain + automation/analysis/repo tools). REST API sedang
dibangun bertahap di atas MCP yang sudah stabil (lihat `docs/ROADMAP_V3.md`):
auth transport (R3) sudah ada, endpoint per-domain (R1/R2) menyusul.
Panduan ini untuk menjalankan/menguji keduanya.

## 0. Prasyarat: `DATABASE_URL`

1. Copy `backend/.env.example` ke `backend/.env` (sudah gitignored, aman
   diisi kredensial asli).
2. Isi `DATABASE_URL` dari Supabase Dashboard → Project Settings →
   Database → Connection string.
3. **Kalau direct connection (`db.<ref>.supabase.co:5432`) gagal konek**
   (biasanya `no such host` / timeout) — itu karena hostnya IPv6-only dan
   banyak jaringan lokal/Windows tidak punya rute IPv6 keluar. Pakai
   **Session pooler** sebagai gantinya: di halaman yang sama pilih mode
   pooler "Session" (bukan "Transaction"), formatnya:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-<N>-<region>.pooler.supabase.com:5432/postgres
   ```
   Nomor `aws-<N>` tidak bisa ditebak — ambil persis dari dashboard.

Semua perintah di bawah dijalankan dari folder `backend/`.

---

## Menjalankan REST API

```bash
cd backend
go run ./rest-api/cmd
```

Default listen di `:8081` (override dengan env `HTTP_PORT`). Server
membaca `DATABASE_URL` dari environment — pastikan sudah di-export atau
pakai tool yang otomatis load `.env` (lihat catatan Windows/PowerShell di
bawah).

Butuh juga `SUPABASE_URL` di environment (Supabase Dashboard → Project
Settings → API → Project URL) — server menolak start tanpa itu sejak R3
(`docs/ROADMAP_V3.md`). **Bukan** `SUPABASE_JWT_SECRET`/HS256 seperti
diasumsikan awalnya di draft R3 — project ini ternyata sudah pakai skema
signing key baru (JWKS/ES256, terverifikasi empiris: token asli ditolak
dengan `signing method ES256 is invalid` saat masih pakai HS256). Server
fetch public key langsung dari `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
(endpoint publik, tidak butuh secret — lihat `rest-api/internal/auth/jwks.go`).

Test (butuh access token Supabase Auth asli — login lewat frontend lalu
ambil dari `supabase.auth.getSession()` di devtools, atau dari network tab;
atau pakai `rest-api/internal/testsupport` untuk generate test user tanpa
Google OAuth — lihat README di folder itu):

```bash
curl -H "Authorization: Bearer <supabase-access-token>" http://localhost:8081/projects
```

Tanpa header `Authorization` yang valid akan dapat `401`. `GET /projects/:id`
juga menolak dengan `403` kalau user login tidak punya accepted membership
di project itu (lihat `rest-api/internal/auth/` — replikasi
`has_project_access()`/`can_edit_project_content()`/`is_project_manager()`
di Go, karena RLS Postgres yang mengandalkan `auth.uid()` tidak otomatis
berlaku untuk koneksi `DATABASE_URL` langsung, hanya untuk PostgREST).

---

## Menjalankan MCP Server — dua mode, pilih sesuai kebutuhan

MCP server pakai **API token**, bukan session login biasa (sama seperti
Node di `NvlFr-testify` — satu API token selalu terikat ke satu project).
Ada **dua entry point berbeda** untuk dua skenario pemakaian yang berbeda:

| | `mcp-server/cmd` (stdio) | `mcp-server/cmd-http` (HTTP) |
|---|---|---|
| Dipakai untuk | Dev lokal di laptop sendiri | **Deploy ke VPS/server**, diakses AI agent dari mana saja |
| Cara client konek | Client (mis. Claude Desktop) **menjalankan proses ini sebagai child process** di mesin yang sama — tidak ada network sama sekali | Client connect ke URL HTTP (`https://host:port/mcp`), sama seperti connect ke REST API |
| Token/project di-set | Sekali di startup (env var `TM_API_TOKEN`/`TM_PROJECT_ID`) — satu proses = satu client selamanya | **Per-request** (header `Authorization`/`X-Testify-Project-Id`) — satu proses melayani banyak client/token berbeda sekaligus |
| Siapa yang butuh install/jalankan | Tiap orang yang mau pakai, jalankan sendiri di mesinnya | Cukup Anda, sekali, di VPS — orang lain tinggal connect |

**Kalau Anda mau hasil akhirnya "server jalan di VPS, AI agent connect dari
mana saja" — pakai `cmd-http`, bukan `cmd`.** `cmd` (stdio) cocok untuk
development/testing cepat di laptop sendiri saja.

### Env var per mode

**stdio (`cmd`):**

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string Postgres (lihat §0) |
| `TM_API_TOKEN` | Token dari tabel `api_tokens` (format `tm_` + 64 hex char) |
| `TM_PROJECT_ID` | UUID project yang token itu di-scope ke situ |
| `TM_MCP_READONLY` | `1` = hanya register read tools (opsional) |

**HTTP (`cmd-http`):**

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Sama seperti di atas |
| `HTTP_PORT` | Port listen, default `8082` |
| `TM_MCP_READONLY` | Sama seperti di atas |

Tidak ada `TM_API_TOKEN`/`TM_PROJECT_ID` di mode HTTP — itu dikirim **oleh
tiap client** lewat header per-request (lihat §Konek lewat HTTP di bawah),
karena satu proses server HTTP melayani banyak token/project sekaligus.

### Membuat token dulu

Ada dua cara:

**Cara normal (lewat UI, disarankan)** — buka project di Testify → Project
Settings → tab **Agent Tokens** (manager-only) → "Generate Agent Token",
isi nama lalu pilih **Access Level**: "Read Only" (semua `read:*`) atau
"Read & Write" (`read:*` + semua `write:*` yang diizinkan role kamu). Tidak
ada pilihan scope satu-satu — agen otomatis mewarisi akses project user
yang generate, tidak pernah lebih. Salin raw token yang muncul sekali —
tidak bisa dilihat lagi setelahnya. Di baliknya ini memanggil RPC
`mint_api_token` (security definer, `supabase/migrations/20260802170708_api_tokens_mint_rpc.sql`)
yang membatasi scope sesuai role member yang mint (lihat
`allowed_token_scopes()` di migration yang sama; pemetaan access-level →
scope ada di `frontend/src/services/apiTokenService.ts`
`scopesForAccessLevel()`).

**Cara manual (SQL langsung, kalau tidak lewat browser)** — panggil RPC
yang sama lewat `psql`/Supabase SQL editor, login sebagai user target
(atau lewat service role dengan `auth.uid()` di-set manual):

```sql
select * from mint_api_token(
  '<uuid-project-target>',
  'local-dev',
  array['read:project', 'read:issues', 'write:issues']
);
```

Hasilnya satu baris `(token, id)` — `token` adalah raw token
(`tm_[0-9a-f]{64}`), disimpan cuma sebagai SHA-256 hash di DB, tidak
pernah bisa diambil ulang setelah response ini.

### Jalankan server

```bash
cd backend
TM_API_TOKEN=tm_xxxx... TM_PROJECT_ID=<uuid> TM_MCP_READONLY=1 go run ./mcp-server/cmd
```

(Di PowerShell: `$env:TM_API_TOKEN="..."; $env:TM_PROJECT_ID="..."; go run ./mcp-server/cmd`)

MCP server pakai **stdio transport** — tidak buka port jaringan, tidak
bisa di-`curl`. Dia menunggu request JSON-RPC lewat stdin dan menjawab
lewat stdout. Kalau start sukses akan ada log `authenticated: token=...`
lalu `starting MCP server with N tool groups`, lalu diam menunggu input.

### Test manual tanpa MCP client (kirim JSON-RPC langsung)

Berguna untuk debug cepat tanpa install client MCP:

```bash
cat <<'EOF' > /tmp/req.jsonl
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"manual-test","version":"0.0.1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"testify.project.list","arguments":{}}}
EOF

TM_API_TOKEN=tm_xxxx... TM_PROJECT_ID=<uuid> TM_MCP_READONLY=1 \
  go run ./mcp-server/cmd < /tmp/req.jsonl
```

Baris terakhir output berisi hasil `testify.project.list` — array project
di `structuredContent`.

---

## Menjalankan MCP Server via HTTP (untuk deploy ke VPS)

```bash
cd backend
DATABASE_URL="..." HTTP_PORT=8082 go run ./mcp-server/cmd-http
```

Server langsung listen di port itu — **tidak butuh token/project di
startup**, tidak seperti mode stdio. Endpoint: `POST /mcp`.

### Test manual dengan curl

MCP StreamableHTTP butuh sesi dua langkah: `initialize` dulu (server balas
`Mcp-Session-Id` di response header), baru request berikutnya menyertakan
session ID itu + header auth.

```bash
# 1. initialize — ambil Mcp-Session-Id dari response header
curl -s -i -X POST http://localhost:8082/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl-test","version":"0.0.1"}}}'
# → catat nilai header "Mcp-Session-Id: mcp-session-xxxx"

# 2. tools/call — pakai session ID dari langkah 1 + token & project via header
curl -s -X POST http://localhost:8082/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: mcp-session-xxxx" \
  -H "Authorization: Bearer tm_xxxx..." \
  -H "X-Testify-Project-Id: <uuid-project>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"testify.project.list","arguments":{}}}'
```

Response berisi `structuredContent` array project — sama persis bentuknya
dengan hasil mode stdio, karena keduanya reuse tool handler yang sama
(`mcp-server/internal/tools/read_tools.go`), cuma beda cara Session
di-resolve (`Registry.SessionFor` — lihat komentar di
`mcp-server/internal/tools/registry.go` untuk detail mekanismenya).

Tanpa header `Authorization`/`X-Testify-Project-Id` yang valid, tool call
menolak dengan `"no session available for this call"` (`isError: true`) —
bukan error HTTP generik, supaya client tahu persis alasannya.

### Skenario: agen AI menarik & mengerjakan Issue suatu project

Ini alur konkret untuk "agen login, tarik daftar Issue project yang dia
akses, lalu kerjakan" — yang jadi motivasi tab Agent Tokens di atas.

1. **Mint token** lewat UI (Project Settings → Agent Tokens), pilih
   **Read & Write** (supaya agen bisa panggil `testify.issue.updateStatus`
   di langkah 5) — kalau cuma mau agen membaca daftar Issue tanpa update
   status, pilih **Read Only**. Token ini scoped ke satu project saja
   (`X-Testify-Project-Id` harus cocok).
2. **Konfigurasi MCP client agen** — cara termudah: klik **"Copy Setup
   Prompt"** di dialog yang muncul setelah generate token, lalu paste
   langsung ke chat agen (Claude Code, Claude Desktop, atau agen apa pun
   yang bisa HTTP request). Prompt itu berisi instruksi lengkap + endpoint
   + token + kedua opsi setup (register lewat `claude mcp add
   --transport http --header ...`, atau fallback curl JSON-RPC manual
   kalau agennya tidak punya command itu) — agen yang mengeksekusi
   sendiri, user tidak perlu paham MCP sama sekali (lihat
   `frontend/src/helpers/mcpSetupPrompt.ts` untuk isi persisnya). URL
   endpoint di prompt itu diambil dari env `VITE_MCP_SERVER_URL` —
   **wajib diisi setelah `cmd-http` di-deploy**, kalau kosong prompt
   berisi placeholder yang harus diedit manual.
   Setup manual (tanpa prompt) juga tetap bisa: connect ke `cmd-http`
   (`https://<host>/mcp` kalau sudah di-deploy, atau
   `http://localhost:8082/mcp` untuk test lokal) dengan header
   `Authorization: Bearer <token>` dan `X-Testify-Project-Id: <uuid>` di
   setiap request (lihat §Test manual dengan curl untuk detail dua-langkah
   `initialize` → `Mcp-Session-Id` → `tools/call`).
3. **Agen memanggil `testify.issue.search`** (opsional filter
   `status`/`priority`/`assignee`) untuk dapat daftar Issue yang perlu
   dikerjakan, scoped otomatis ke project token itu — tidak bisa lihat
   Issue project lain.
4. **Agen mengerjakan perbaikannya di luar MCP** — MCP di sini adalah
   *sumber data Issue*, bukan task runner. Fix kode tetap lewat tool
   development biasa agen (baca/edit file, jalankan test, dst) terhadap
   repo aplikasi yang relevan, bukan lewat MCP tool apa pun.
5. **Agen memanggil `testify.issue.updateStatus`** setelah selesai untuk
   menandai Issue itu resolved/closed — ini satu-satunya tulis balik ke
   Testify yang diizinkan scope di atas (test case/plan/run tetap
   read-only untuk token dengan scope minimal ini).

### Deploy ke VPS (garis besar)

1. Build binary: `go build -o mcp-server-http ./mcp-server/cmd-http`
2. Jalankan sebagai service (systemd/pm2/dst) dengan `DATABASE_URL` di
   environment-nya
3. Taruh di belakang reverse proxy (nginx/Caddy) untuk TLS + domain, proxy
   `https://mcp.domain-anda.com/mcp` → `http://127.0.0.1:8082/mcp`
4. AI agent mana pun connect ke `https://mcp.domain-anda.com/mcp` dengan
   token API mereka sendiri di header — **tidak perlu install apa pun di
   sisi mereka**, ini beda total dari mode stdio

Detail hardening produksi (rate-limit per token, audit trail, CORS untuk
client browser-based) belum diimplementasikan — lihat `TASKS.md` T4.2 dan
`BACKLOG.md` Epic 4, di luar scope validation spike ini.

---

## Konek dari MCP client sungguhan (Claude Desktop / Claude Code) — mode stdio

MCP server ini pakai **stdio**, jadi client-nya harus tahu cara meng-
*execute* binary/`go run`, bukan connect ke URL HTTP. **Kalau target Anda
adalah server di VPS yang diakses banyak AI agent dari mana saja, ini
bukan cara yang tepat — pakai §Menjalankan MCP Server via HTTP di atas.**
Bagian ini untuk skenario dev lokal saja.

### Opsi A — `go run` langsung (tidak perlu build binary dulu)

**Claude Desktop** (`claude_desktop_config.json` — Windows:
`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "testify": {
      "command": "go",
      "args": ["run", "./mcp-server/cmd"],
      "cwd": "D:\\shiftech\\software-projects\\shiftech-test-mgr\\backend",
      "env": {
        "DATABASE_URL": "postgresql://...",
        "TM_API_TOKEN": "tm_xxxx...",
        "TM_PROJECT_ID": "00000000-0000-0000-0000-000000000000",
        "TM_MCP_READONLY": "1"
      }
    }
  }
}
```

**Claude Code** (CLI): tambahkan server yang sama lewat
`claude mcp add` (lihat `claude mcp add --help` untuk syntax env/cwd
terbaru), atau taruh konfigurasi setara di file MCP project-level kalau
sudah pakai itu.

### Opsi B — build binary dulu (lebih cepat start, tidak re-compile tiap kali)

```bash
cd backend
go build -o mcp-server.exe ./mcp-server/cmd
```

Lalu di config client, `command` diarahkan ke path `.exe` itu langsung
(tanpa `args: ["run", ...]`), env var sama seperti Opsi A.

### Setelah terhubung

Tool yang tersedia baru satu: `testify.project.list` (tanpa parameter).
Panggil dari client (mis. tanya asisten "list projects pakai testify")
untuk verifikasi koneksi jalan.

---

## Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| `DATABASE_URL is not set` | Env var belum ter-set di shell/config client |
| `dial tcp ...: no such host` / connection refused ke `db.<ref>.supabase.co` | Direct connection IPv6-only tidak reachable — pakai Session pooler (lihat §0) |
| `authenticate: invalid or revoked API token` | `TM_API_TOKEN` salah, atau `token_hash` di DB tidak cocok — cek ulang SHA-256-nya |
| `token project ... does not match TM_PROJECT_ID ...` | `TM_PROJECT_ID` yang dikirim beda dari `api_tokens.project_id` milik token itu |
| MCP client tidak menampilkan tool apa pun | Cek `TM_MCP_READONLY` — kalau bukan `"1"` dan write tools belum ada (`registry.go` masih comment), `Full()` tetap hanya balikin read tools untuk saat ini, jadi ini seharusnya tidak jadi masalah; cek log stderr proses MCP untuk error auth duluan |
| (HTTP mode) `"no session available for this call"` | Header `Authorization: Bearer <token>` dan/atau `X-Testify-Project-Id` tidak dikirim atau salah — cek keduanya ada di request |
| (HTTP mode) request kedua (`tools/call`) gagal/diabaikan | Lupa sertakan header `Mcp-Session-Id` dari response `initialize` — StreamableHTTP butuh ini untuk request lanjutan dalam sesi yang sama |
| (HTTP mode) project ter-return tidak sesuai yang diharapkan | `X-Testify-Project-Id` yang dikirim beda dari `api_tokens.project_id` milik token itu — auth akan gagal diam-diam (context tidak didekorasi) alih-alih error eksplisit, lihat `authenticateRequest` di `mcp-server/cmd-http/main.go` |
