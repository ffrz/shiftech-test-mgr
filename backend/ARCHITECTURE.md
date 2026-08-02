# Backend Architecture — Testify Platform (Go)

## Overview

Monorepo Go dengan **shared-core architecture**: satu `core/` domain,
`repository/` implementasi, dan `service/` business logic dipakai oleh **dua
transport** berbeda — MCP server (sekarang, **transport utama: MCP over
StreamableHTTP** — dipilih karena lebih reliable untuk jangka panjang
dibanding stdio, lihat `RUNNING.md`) dan REST API (nanti).

```
                         ┌────────────────────────────────────────┐
                         │           core/                        │
                         │  domain.go    — domain types           │
                         │  ports.go     — repository interfaces  │
                         └──────────┬─────────────────────────────┘
                                    │ implements
                         ┌──────────┴────────────────────────┐
                         │      repository/postgres/         │
                         │  (GORM, query mentah ke Supabase) │
                         │  Satu-satunya layer yang tahu DB  │
                         │  Adapter boundary: implements core/│
                         │  interfaces, bisa diganti storage  │
                         │  lain tanpa ubah layer di atasnya  │
                         └──────────┬─────────────────────────┘
                                    │ injected into
                         ┌──────────┴─────────────────────────┐
                         │            service/                │
                         │  Business logic & validasi state:  │
                         │  ProjectService, TestCaseService,  │
                         │  TestPlanService, TestRunService,  │
                         │  IssueService, ModuleService,      │
                         │  TagService, TestRoleService       │
                         │  Depend HANYA ke interface core/,  │
                         │  tidak tahu GORM/Postgres/Supabase │
                         └──────────┬──────────────────────┬─┘
                                    │ injects              │ injects
                      ┌─────────────┴────────────┐  ┌──────┴─────────────────┐
                      │     mcp-server/          │  │     rest-api/          │
                      │  Transport: MCP over     │  │  Transport: HTTP/Echo  │
                      │  StreamableHTTP (cmd-http│  │  Auth: JWT/Google      │
                      │  — PRIMARY, dipakai VPS) │  │  (RESTful endpoints)   │
                      │  MCP stdio (cmd — dev/   │  │                        │
                      │  local client only)      │  │                        │
                      │  Auth: API token         │  │                        │
                      │  (42 tools over 5 groups)│  │                        │
                      └──────────────────────────┘  └────────────────────────┘
```

## Prinsip

1. **Interface dulu, implementasi belakangan** — `core/ports.go` mendefinisikan
   kontrak (`ProjectRepository`, `TestCaseRepository`, dsb.), consumer hanya
   tahu interface, tidak tahu GORM/Supabase. Interface inilah adapter
   boundary-nya — implementasi konkret (`repository/postgres/`) bisa diganti
   storage lain kapan saja tanpa mengubah `service/` atau transport.

2. **Satu sumber kebenaran domain** — `core/domain.go` adalah definisi tunggal
   untuk `Project`, `TestCase`, `TestRun`, `Issue`, `APITokenIdentity`. Tidak
   ada duplikasi type antar transport.

3. **Repository = boundary ke DB** — hanya `repository/postgres/` yang import
   GORM dan tahu koneksi Supabase. Mapping `snake_case` DB row → domain
   `camelCase` terjadi di sini. Tidak ada business rule di sini — repository
   murni CRUD/query.

4. **Service = satu-satunya tempat business logic** — `service/` menampung
   validasi state transition dan domain rules (mis. Issue hanya boleh dibuat
   dari TestResult berstatus FAIL, TestRun Complete harus mengecek summary,
   dst). Service depend ke interface `core/ports.go`, tidak pernah ke
   `*gorm.DB` atau tipe GORM lain — supaya bisa di-unit-test dengan fake
   repository tanpa database sungguhan. Setiap aggregate (Project, TestCase,
   TestPlan, TestRun, Issue, Module, Tag, TestRole) punya satu service.

   **Kenapa layer ini wajib ada:** tanpa service, MCP tool handler dan REST
   handler masing-masing akan memanggil repository langsung, sehingga setiap
   business rule harus ditulis ulang (dan bisa jadi tidak konsisten) di kedua
   transport. Ini adalah kesalahan yang sudah terjadi di `frontend/` — lihat
   §Frontend parallel di bawah.

5. **Transport = tipis** — MCP tool handler dan REST handler hanya parsing
   input (termasuk validasi shape/format) + delegasi ke **service**, TIDAK
   LANGSUNG ke repository. Tidak ada business logic di layer transport. Layer
   transport berperan sebagai "controller" — tidak perlu layer controller
   terpisah karena tugas itu sudah dikerjakan di sini.

6. **Auth per transport** — MCP pakai API token (`api_tokens` table, SHA-256
   hash), REST akan pakai JWT/Google OAuth. Keduanya validasi di middleware
   masing-masing, tidak ada di `core/`.

## Frontend parallel — kenapa service/adapter ini tidak boleh diskip

Di `frontend/`, layer `repositories/` secara nominal ada sebagai "boundary",
tapi query Supabase (`.select().eq().order()`, gaya PostgREST) bocor sampai ke
`services/`/komponen karena tidak ada abstraksi murni di antaranya. Akibatnya,
saat frontend sudah besar, mengganti/membungkus storage jadi mahal untuk
di-refactor.

Di backend Go, hal yang sama bisa terjadi kalau:
- `service/` atau `mcp-server/`/`rest-api/` ikut import `gorm.io/gorm` secara
  langsung (bukan cuma lewat interface `core/ports.go`) — ini bocor yang
  identik dengan kasus Supabase di frontend, sehingga **hindari** ini.
- GORM memang mengurangi kerja *ganti dialect SQL* (Postgres↔MySQL), tapi
  tidak menghilangkan kebutuhan adapter pattern — GORM tidak membantu untuk
  ganti ke storage non-SQL, unit testing tanpa DB asli, atau proteksi dari
  bentuk query yang bocor ke layer atas.

Karena itu `service/` dan adapter boundary (`core/ports.go`) dibuat **di awal**
sebelum modul-modul lain ditambah, bukan di-refactor belakangan.

## Layer

### `core/` — no framework dependency

| File        | Isi                                                  |
| ----------- | ---------------------------------------------------- |
| `domain.go` | Domain types, enums, value objects                   |
| `ports.go`  | Repository interfaces (kontrak untuk semua consumer) |

Aturan:

- Tidak boleh import GORM, Echo, MCP SDK, atau library eksternal apa pun
- Hanya boleh import `context`, `time`, `errors`

### `repository/postgres/` — satu-satunya layer DB

| File                 | Implementasi              |
| -------------------- | -------------------------- |
| `project_repo.go`    | `core.ProjectRepository`   |
| `token_repo.go`      | `core.TokenRepository`     |
| `testcase_repo.go`   | `core.TestCaseRepository`  |
| `testplan_repo.go`   | `core.TestPlanRepository`  |
| `testrun_repo.go`    | `core.TestRunRepository`   |
| `issue_repo.go`      | `core.IssueRepository`     |
| `module_repo.go`     | `core.ModuleRepository`    |
| `tag_repo.go`        | `core.TagRepository`       |
| `testrole_repo.go`   | `core.TestRoleRepository`  |

### `service/` — business logic, satu-satunya consumer dari repository

| File                    | Isi                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `project_service.go`    | `ProjectService` — wraps `core.ProjectRepository`           |
| `testcase_service.go`   | `TestCaseService` — wraps `core.TestCaseRepository`         |
| `testplan_service.go`   | `TestPlanService` — wraps `core.TestPlanRepository`         |
| `testrun_service.go`    | `TestRunService` — wraps `core.TestRunRepository`           |
| `issue_service.go`      | `IssueService` — wraps `core.IssueRepository`               |
| `module_service.go`     | `ModuleService` — wraps `core.ModuleRepository`             |
| `tag_service.go`        | `TagService` — wraps `core.TagRepository`                   |
| `testrole_service.go`   | `TestRoleService` — wraps `core.TestRoleRepository`         |

Pola setiap file:

```go
type XxxService struct { repo core.XxxRepository }   // depend ke interface, bukan struct konkret
func NewXxxService(repo core.XxxRepository) *XxxService
func (s *XxxService) Method(ctx, input) (...)        // validasi/business rule, lalu delegasi ke repo
```

Aturan:

- Tidak boleh import `gorm.io/gorm`, `mark3labs/mcp-go`, atau `labstack/echo`
- Hanya boleh import `core/`, `context`, `errors`, `fmt`
- Business rule/validasi state yang menyentuh lebih dari satu repository
  (mis. Issue harus dibuat dari TestResult FAIL) tinggal di sini, bukan di
  repository atau transport

Pola setiap file repository (untuk referensi implementasi di bawah `service/`):

```go
type XxxRepo struct { db *gorm.DB }        // struct privat
func NewXxxRepo(db *gorm.DB) *XxxRepo      // constructor
func (r *XxxRepo) Method(ctx, input) (...) // implementasi interface

type xxxRow struct { ... }                 // row DB (snake_case)
func (xxxRow) TableName() string           // nama tabel
func (xxxRow) toDomain() core.Xxx          // mapping
```

### `mcp-server/` — MCP protocol transport

Dua entry point, **cmd-http adalah transport utama** (production/VPS) — lebih
reliable untuk jangka panjang karena tidak terikat lifecycle satu proses
client seperti stdio. `cmd` (stdio) tetap ada untuk dev/local client (mis.
Claude Desktop) yang hanya bicara MCP stdio.

```
cmd/main.go              # stdio — dev/local client only. DB connect → wire repos
                         #         → wire services → auth (1x saat startup) → tools → serve stdio
cmd-http/main.go         # StreamableHTTP — PRIMARY transport. DB connect → wire repos
                         #         → wire services → tools → serve HTTP (auth per-request)
internal/
  auth/session.go        # API token validation, scope checking (dipakai kedua entry point)
  tools/
    registry.go          # ToolRegistrar interface + ReadOnly/Full dispatcher; Repos di-wrap jadi Services
    read_tools.go        # Group: testify.project.*, testify.testcase.*, testify.testplan.*,
                         #         testify.testrun.*, testify.testresult.*, testify.issue.*,
                         #         testify.requirement.*, testify.artifact.*
    write_tools.go       # Group: testify.testcase.create/update/duplicate/archive,
                         #         testify.testplan.create/addCases/removeCases/approve,
                         #         testify.testrun.create/recordResult/complete,
                         #         testify.issue.create/comment/updateStatus/detectDuplicate
    automation_tools.go  # Group: testify.automation.*, testify.rerunFailed
    analysis_tools.go    # Group: testify.analysis.runSummary/flakyCandidates/suggestRetest
```

Semua tool handler di atas memanggil `Registry.Services.Xxx`, bukan
`Registry.Repos.Xxx` langsung — repository hanya di-inject ke service saat
wiring di `main.go`/`cmd-http/main.go`.

Auth flow MCP:

- **stdio (`cmd/`)**: `TM_API_TOKEN` + `TM_PROJECT_ID` dari environment,
  autentikasi sekali di startup (`auth.Load`), session di-set langsung ke
  `Registry.Session` — cocok untuk satu proses = satu client.
- **HTTP (`cmd-http/`)**: token dari header `Authorization: Bearer <token>` +
  `X-Testify-Project-Id` per request (`auth.LoadFromToken`), session
  di-attach ke context request (`auth.WithSession`) — cocok untuk banyak
  client konkuren, ini alasan HTTP dipilih sebagai transport utama.
- Setiap tool call (kedua transport): cek scope token via
  `Session.EnsureScope()`; project scoping — session terikat ke 1 project,
  semua tool menolak akses lintas project.

Tool naming convention: `testify.<domain>.<action>` (menggantikan prefix
`testmanager.*` dari MCP Node).

### `rest-api/` — HTTP transport (akan datang)

Akan menggantikan Supabase sebagai backend langsung frontend. Shares `core/` +
`repository/postgres/` + `service/` dengan MCP server — handler REST memanggil
service yang sama persis dengan tool MCP, supaya business rule tidak
diduplikasi/berbeda antar transport. Implementasi menunggu MCP server stabil.

## Database

Koneksi langsung ke Supabase Postgres via `DATABASE_URL` environment variable.
Koneksi pooler Supabase (port 6543) direkomendasikan untuk production.

**Tabel yang dibutuhkan MCP server:**

| Tabel                                                                         | Kebutuhan                | Status di sibling                    |
| ----------------------------------------------------------------------------- | ------------------------ | ------------------------------------ |
| `api_tokens`                                                                  | Auth MCP (wajib)         | **Belum ada** — perlu migration baru |
| `projects`, `test_cases`, `test_plans`, `test_runs`, `test_results`, `issues` | Domain core              | Sudah ada (schema v2)                |
| `modules`, `tags`, `test_case_tags`, `test_case_steps`                        | Test case detail         | Sudah ada                            |
| `test_plan_cases`, `test_result_steps`                                        | Plan scope, step results | Sudah ada                            |
| `profiles`, `project_members`                                                 | Validasi human actor     | Sudah ada (platform v2)              |
| `requirements`, `requirement_links`                                           | Requirement tools        | **Belum ada**                        |
| `automation_scripts`, `automation_jobs`, `automation_runners`                 | Automation tools         | **Belum ada**                        |
| `project_repositories`                                                        | Repo link tools          | **Belum ada**                        |
| `comments`                                                                    | Issue comment            | Sudah ada                            |
| `ai_audit_events`                                                             | Audit trail              | **Belum ada**                        |

Prioritas: `api_tokens` dulu (migration baru), sisanya bertahap sesuai tool yang
diaktifkan.

## Perbandingan dengan MCP server Node (NvlFr-testify)

| Aspek              | MCP Node (lama)                                                                        | MCP Go (baru)                                       |
| ------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Bahasa             | TypeScript/Node 20+                                                                    | Go 1.25+                                            |
| Transport          | `@modelcontextprotocol/sdk` (stdio)                                                    | `mark3labs/mcp-go` (stdio)                          |
| Akses DB           | 39 RPC via `fetch()` ke PostgREST                                                      | 1 koneksi direct DB via GORM                        |
| Auth               | RPC `authenticate_mcp_api_token` per call                                              | Hash lookup di startup, session in-memory           |
| Project scoping    | Dicek ulang di tiap RPC                                                                | Dicek sekali di `auth.Load()` + dijamin di registry |
| Read-only mode     | Flag env, hanya register read tools                                                    | Flag env, `Registry.ReadOnly()`                     |
| Rate limit + audit | 2 RPC (`mcp_begin_tool_call`, `mcp_complete_tool_call`) + tabel `mcp_tool_rate_limits` | Belum diimplementasikan (akan datang)               |
| Validasi           | Zod per tool                                                                           | Go struct tag + manual di handler                   |
| Testing            | Node built-in `node:test`                                                              | Go built-in `testing`                               |

## Urutan implementasi

```
Phase 1 — Fondasi (sekarang)
  [x] Scaffold struktur direktori
  [x] core/domain.go + core/ports.go
  [x] repository/postgres/project_repo.go (contoh pola)
  [x] repository/postgres/token_repo.go (auth MCP)
  [x] mcp-server/cmd/main.go (DI wiring)
  [x] mcp-server/internal/auth/session.go
  [x] mcp-server/internal/tools/registry.go
  [ ] go mod tidy + go get mark3labs/mcp-go
  [ ] Wiring MCP stdio server di main.go
  [ ] Read tools: project, testcase, testplan, testrun, issue

Phase 2 — DB prerequisites
  [ ] Migration api_tokens table di supabase/migrations/
  [ ] Implement TestCaseRepo, TestPlanRepo, TestRunRepo, IssueRepo
  [ ] End-to-end test: token → project.list → testcase.search → testrun.get

Phase 3 — Write tools
  [ ] testcase.create/update, testplan.create/addCases/approve
  [ ] testrun.create/recordResult/complete
  [ ] issue.create/comment/updateStatus
  [ ] Scope validation per tool group

Phase 4 — Automation + Analysis (opsional, butuh tabel baru)
  [ ] Migration: automation_scripts, automation_jobs, automation_runners
  [ ] Migration: requirements, requirement_links
  [ ] Migration: project_repositories
  [ ] Automation tools
  [ ] Analysis tools

Phase 5 — REST API
  [ ] Echo HTTP server scaffold
  [ ] Handler layer (inject repository yang sama dengan MCP)
  [ ] Auth middleware (JWT/Google)
  [ ] CRUD endpoints
```

## Environment variables

| Variable          | Consumer   | Deskripsi                            |
| ----------------- | ---------- | ------------------------------------ |
| `DATABASE_URL`    | MCP + REST | Supabase Postgres connection string  |
| `TM_API_TOKEN`    | MCP        | API token (format `tm_[0-9a-f]{64}`) |
| `TM_PROJECT_ID`   | MCP        | UUID project scope target            |
| `TM_MCP_READONLY` | MCP        | `1` = hanya register read tools      |

## Dependency

```
go.mod:
  github.com/google/uuid    # UUID generation
  gorm.io/gorm              # ORM
  gorm.io/driver/postgres   # Postgres driver
  github.com/lib/pq         # Postgres driver dependency

(akan ditambah):
  github.com/mark3labs/mcp-go   # MCP protocol Go implementation
  github.com/labstack/echo/v4   # HTTP framework (rest-api phase)
```
