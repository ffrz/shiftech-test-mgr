# Cara menjalankan backend Go (mcp-server & rest-api)

Status saat ini: **validation spike** (lihat `VALIDATION.md`) — hanya
`testify.project.list` (MCP, tersedia lewat dua entry point: stdio untuk
dev lokal dan HTTP untuk deploy VPS/remote) dan `GET /projects` (REST)
yang benar-benar jalan. Panduan ini untuk menjalankan/menguji ketiganya.

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

Test:

```bash
curl http://localhost:8081/projects
```

Harus mengembalikan JSON array project. **Belum ada auth** — jangan
expose port ini ke jaringan publik.

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

### Membuat token dulu (belum ada UI untuk ini)

Belum ada endpoint/tool untuk generate token sendiri (itu bagian dari
`TASKS.md` fase mendatang). Untuk sekarang, insert manual lewat SQL:

```sql
insert into api_tokens (project_id, name, token_prefix, token_hash, scopes, created_by)
values (
  '<uuid-project-target>',
  'local-dev',
  'tm_xxxxxxxxxx',              -- 12 karakter pertama dari raw token di bawah, cuma buat label
  '<sha256-hex-dari-raw-token>', -- lihat cara generate di bawah
  array['read:project'],
  '<uuid-profil-pembuat>'        -- profiles(id), bukan users(id)
)
returning id;
```

Raw token harus cocok pola `tm_[0-9a-f]{64}` dan `token_hash` adalah
SHA-256 hex dari raw token itu (bukan raw token itu sendiri yang disimpan
— raw token cuma dipegang klien, tidak pernah masuk database). Contoh
generate raw token + hash-nya pakai `openssl`:

```bash
RAW="tm_$(openssl rand -hex 32)"
echo "raw token (simpan ini): $RAW"
echo "token_hash (masukkan ke kolom token_hash): $(printf '%s' "$RAW" | openssl dgst -sha256 -hex | awk '{print $2}')"
```

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
