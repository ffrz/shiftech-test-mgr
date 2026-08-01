# Backend Architecture — Testify Platform (Go)

## Overview

Monorepo Go dengan **shared-core architecture**: satu `core/` domain +
`repository/` implementasi dipakai oleh **dua transport** berbeda — MCP server
(sekarang) dan REST API (nanti).

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
                         └──────────┬──────────────────────┬─┘
                                    │ injects              │ injects
                      ┌─────────────┴────────────┐  ┌──────┴─────────────────┐
                      │     mcp-server/          │  │     rest-api/          │
                      │  Transport: MCP stdio    │  │  Transport: HTTP/Echo  │
                      │  Auth: API token         │  │  Auth: JWT/Google      │
                      │  (42 tools over 5 groups)│  │  (RESTful endpoints)   │
                      └──────────────────────────┘  └────────────────────────┘
```

## Prinsip

1. **Interface dulu, implementasi belakangan** — `core/ports.go` mendefinisikan
   kontrak (`ProjectRepository`, `TestCaseRepository`, dsb.), consumer hanya
   tahu interface, tidak tahu GORM/Supabase.

2. **Satu sumber kebenaran domain** — `core/domain.go` adalah definisi tunggal
   untuk `Project`, `TestCase`, `TestRun`, `Issue`, `APITokenIdentity`. Tidak
   ada duplikasi type antar transport.

3. **Repository = boundary ke DB** — hanya `repository/postgres/` yang import
   GORM dan tahu koneksi Supabase. Mapping `snake_case` DB row → domain
   `camelCase` terjadi di sini.

4. **Transport = tipis** — MCP tool handler dan REST handler hanya parsing
   input + delegasi ke repository interface. Tidak ada business logic di layer
   transport.

5. **Auth per transport** — MCP pakai API token (`api_tokens` table, SHA-256
   hash), REST akan pakai JWT/Google OAuth. Keduanya validasi di middleware
   masing-masing, tidak ada di `core/`.

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

| File               | Implementasi                      |
| ------------------ | --------------------------------- |
| `project_repo.go`  | `core.ProjectRepository`          |
| `token_repo.go`    | `core.TokenRepository`            |
| `testcase_repo.go` | `core.TestCaseRepository` (belum) |
| `testplan_repo.go` | `core.TestPlanRepository` (belum) |
| `testrun_repo.go`  | `core.TestRunRepository` (belum)  |
| `issue_repo.go`    | `core.IssueRepository` (belum)    |

Pola setiap file:

```go
type XxxRepo struct { db *gorm.DB }        // struct privat
func NewXxxRepo(db *gorm.DB) *XxxRepo      // constructor
func (r *XxxRepo) Method(ctx, input) (...) // implementasi interface

type xxxRow struct { ... }                 // row DB (snake_case)
func (xxxRow) TableName() string           // nama tabel
func (xxxRow) toDomain() core.Xxx          // mapping
```

### `mcp-server/` — MCP protocol transport

```
cmd/main.go              # Entry point: DB connect → wire repos → auth → tools → serve stdio
internal/
  auth/session.go        # API token validation, scope checking
  tools/
    registry.go          # ToolRegistrar interface + ReadOnly/Full dispatcher
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

Auth flow MCP:

1. `TM_API_TOKEN` + `TM_PROJECT_ID` dari environment
2. Startup: hash token, lookup `api_tokens` via `TokenRepo.Authenticate()`
3. Setiap tool call: cek scope token via `Session.EnsureScope()`
4. Project scoping: session terikat ke 1 project, semua tool menolak akses
   lintas project

Tool naming convention: `testify.<domain>.<action>` (menggantikan prefix
`testmanager.*` dari MCP Node).

### `rest-api/` — HTTP transport (akan datang)

Akan menggantikan Supabase sebagai backend langsung frontend. Shares `core/` +
`repository/postgres/` dengan MCP server. Implementasi menunggu MCP server
stabil.

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
