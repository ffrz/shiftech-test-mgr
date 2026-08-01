# Backend Go — Feature Backlog

Sumber otoritas arsitektur: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Dokumen ini
adalah daftar **epic/fitur** yang perlu dibangun di backend Go (shared-core:
`core/` + `repository/postgres/` + `mcp-server/` + `rest-api/` nanti).
Referensi porting: implementasi TypeScript yang sudah lengkap di
`../../NvlFr-testify/mcp/` (42 tools, 5 grup) — **bukan didesain dari nol**,
tapi di-port + disesuaikan ke shared-core architecture supaya `rest-api/`
bisa reuse layer yang sama.

Urutan epic di bawah = urutan prioritas eksekusi. Detail task per epic ada di
[`TASKS.md`](./TASKS.md); fase/waktu eksekusi ada di [`ROADMAP.md`](./ROADMAP.md).

---

## Epic 1 — Fondasi Repository Layer (Read)

**Tujuan:** lengkapi `repository/postgres/` untuk semua entity domain
Testing (Project sudah ada), supaya MCP read-tools punya implementasi nyata,
bukan `nil`.

- `TestCaseRepo`, `TestPlanRepo`, `TestRunRepo`, `IssueRepo` — implementasi
  `List`/`Get` (ports sudah didefinisikan di `core/ports.go`)
- `ModuleRepo`, `TagRepo`, `TestRoleRepo` — belum ada port-nya, perlu
  ditambah ke `core/ports.go` (dipakai untuk filter search testcase per
  module/tag di MCP `testcase.search`)
- `RequirementRepo` — belum ada port; tabel `requirements`/`requirement_links`
  juga belum ada migration-nya (lihat Epic 6)

Referensi mapping row/query: `NvlFr-testify/mcp/src/repositories/readRepository.ts`.

## Epic 2 — MCP Read Tools (testify.*.list/get/search)

**Tujuan:** aktifkan 13 read-tool di `mcp-server/internal/tools/read_tools.go`
(saat ini stub — `Register()` return `nil`), pakai `mark3labs/mcp-go` untuk
wiring MCP stdio protocol sungguhan (belum pernah di-`go get`, lihat
`ARCHITECTURE.md` §Dependency).

Daftar tool (nama Go: `testify.<domain>.<action>`, padanan Node
`testmanager.<domain>.<action>` di `readTools.ts`):

| Tool | Filter/Input |
|---|---|
| `testify.project.list` | — |
| `testify.project.get` | project_id (harus match session) |
| `testify.testcase.search` | module_id, module, tag, priority, status, query, cursor, limit |
| `testify.testcase.get` | testcase_id |
| `testify.testplan.list` | cursor, limit |
| `testify.testplan.get` | testplan_id |
| `testify.testrun.list` | testplan_id, status, cursor, limit |
| `testify.testrun.get` | testrun_id |
| `testify.testresult.list` | status, tester_id, testrun_id, cursor, limit |
| `testify.issue.search` | status, priority, assignee_id, testrun_id, testcase_id, query, cursor, limit |
| `testify.issue.get` | issue_id |
| `testify.requirement.list` | status, priority, covered, cursor, limit *(butuh Epic 6)* |
| `testify.requirement.get` | requirement_id *(butuh Epic 6)* |
| `testify.requirement.coverage` | — *(butuh Epic 6)* |
| `testify.artifact.get_url` | bucket, path, expires_in *(butuh Supabase Storage signed URL, lihat Epic 8)* |

Pagination: Node pakai opaque cursor per entity (`encodeTestCaseCursor`,
`encodeCodeCursor`, dst, di `readService.ts`) — Go perlu pola cursor yang
setara, bukan offset biasa (lihat `core.PageResult[T]` yang sudah punya
`NextCursor`/`HasMore`).

## Epic 3 — MCP Write Tools (testify.*.create/update/...)

**Tujuan:** aktifkan `write_tools.go` (belum ada file-nya sama sekali —
`registry.go` baris 37 masih di-comment `// &WriteTools{r}`).

Semua write tool di Node bersifat **review-only draft** (tidak langsung
mengubah state final tanpa manusia) kecuali `testplan.approve` dan
`testrun.complete` yang eksplisit butuh human gate — pola ini **wajib
dipertahankan** saat porting, jangan disederhanakan jadi direct-write biasa.

| Tool | Catatan porting |
|---|---|
| `testify.testcase.createBulk` | max 100 per call |
| `testify.testcase.update` | partial update (semua field optional) |
| `testify.testcase.duplicate` | |
| `testify.testcase.archive` | soft — set status, bukan delete |
| `testify.testplan.create` | draft state |
| `testify.testplan.addCases` / `removeCases` | max 100 case_id per call |
| `testify.testplan.approve` | **wajib** `approver_id` + `explicit_approval: true` literal — human gate, jangan dibuat optional |
| `testify.testrun.create` | seed fresh `not_run` result utk setiap case di plan — **tidak pernah** overwrite run lama (aturan domain yang tidak boleh dilanggar, lihat CLAUDE.md §Aturan) |
| `testify.testrun.recordResult` | hanya utk run `in_progress` |
| `testify.testrun.complete` | manual only — jangan pernah infer otomatis dari semua result terisi |
| `testify.issue.create` | wajib link ke `test_result_id` |
| `testify.issue.comment` | |
| `testify.issue.updateStatus` | |
| `testify.issue.detectDuplicate` | **butuh AI-gateway** — lihat Epic 9, bisa di-defer/stub dulu |

Referensi: `NvlFr-testify/mcp/src/tools/writeTools.ts` +
`services/writeService.ts`.

## Epic 4 — Auth & Governance Middleware

**Tujuan:** port pola auth session (`session.go` sudah ada versi dasarnya)
+ tambahkan **rate-limit & audit trail** yang di Node dilakukan lewat 2 RPC
(`mcp_begin_tool_call`/`mcp_complete_tool_call`) dan tabel
`mcp_tool_rate_limits` + `ai_audit_events` — di Go **belum diimplementasikan
sama sekali** (lihat `ARCHITECTURE.md` §Perbandingan, baris "Rate limit +
audit").

- Migration `api_tokens` (lihat Epic 6) — **prasyarat wajib** sebelum tool
  apa pun bisa jalan, karena `auth.Load()` butuh tabel ini
- Middleware governance: bungkus setiap tool call (pola Node:
  `installToolGovernance` di `registry.ts` — wrap `server.registerTool` agar
  semua handler otomatis kena rate-limit + audit tanpa perlu tiap tool
  tahu soal itu)
- Project-scope guard: cek rekursif semua `project_id`/`projectId` di
  argumen tool call menolak akses lintas project (pola Node:
  `ProjectSession.assertToolArguments` di `authService.ts` — Go
  `session.go` saat ini baru cek scope token, belum ada guard rekursif ini)

Referensi: `NvlFr-testify/mcp/src/services/authService.ts`,
`src/repositories/governanceRepository.ts`, `src/tools/registry.ts`
(`installToolGovernance`).

## Epic 5 — Automation & Analysis Tools

**Tujuan:** port 5 automation tool + 3 analysis tool (grup terpisah di
Node: `automationTools.ts`, `analysisTools.ts`).

| Tool | Grup |
|---|---|
| `testify.automation.jobStatus` | read |
| `testify.automation.runnerList` | read |
| `testify.automation.mapScript` | write |
| `testify.automation.enqueue` | write |
| `testify.automation.rerunFailed` | write — di atas safety limit butuh `confirmed_by` + `explicit_confirmation`, human gate seperti `testplan.approve` |
| `testify.analysis.runSummary` | read — pass/fail rate on-demand, **jangan** simpan sebagai kolom cache (aturan domain) |
| `testify.analysis.flakyCandidates` | read |
| `testify.analysis.suggestRetest` | read |

Butuh tabel `automation_scripts`/`automation_jobs`/`automation_runners`
(Epic 6).

## Epic 6 — Database Migrations (tabel baru)

Semua tabel ini **sudah ada polanya** di `NvlFr-testify/supabase/*.sql` —
task-nya adalah port skema (bukan desain dari nol) ke
`supabase/migrations/` project ini dengan penomoran timestamp yang benar.

| Tabel | Prioritas | Referensi schema |
|---|---|---|
| `api_tokens` | **P0 — blocker semua tool** | `schema_019_p2_api_webhooks.sql` |
| `mcp_tool_rate_limits` + RPC `mcp_begin_tool_call`/`mcp_complete_tool_call` | P0 (Epic 4) | `schema_059_mcp_rate_limit_audit.sql` |
| `requirements`, `requirement_links` | P1 (Epic 2 requirement tools) | `schema_015_requirement_traceability.sql` |
| `automation_scripts`, `automation_jobs`, `automation_runners` | P1 (Epic 5) | `schema_024_p3_automation.sql` |
| `project_repositories` | P2 (Epic 7) | `schema_029_project_repositories.sql` |
| `ai_audit_events` | P2 (Epic 4/9, audit trail AI) | cek `schema_023_p3_ai_integration.sql` |

**Catatan penting**: skema Node pakai `scopes text[]` (Postgres native
array) untuk `api_tokens.scopes` — sudah dikonfirmasi & jadi acuan fix Go
repo (`token_repo.go` sekarang pakai `pq.StringArray`, lihat commit terkait).
Jangan desain ulang jadi CSV/jsonb saat menulis migration-nya.

## Epic 7 — Repo Tools (source code access)

**Tujuan:** port 4 tool `testify.repo.*` (list_files, read_file, search,
diff) — dipakai untuk regression selection berbasis diff kode.

Butuh `project_repositories` (Epic 6) + strategi akses source code (Node
kemungkinan clone/checkout via git lokal di runner, bukan API eksternal —
**perlu dikonfirmasi ke referensi `repoRepository.ts`/`repoService.ts`
sebelum desain Go-nya**, jangan asumsikan).

## Epic 8 — Artifact Storage (signed URL)

**Tujuan:** `testify.artifact.getUrl` — signed URL sementara ke Supabase
Storage bucket `automation-artifacts`. Perlu keputusan: pakai Supabase Go
SDK atau REST call langsung ke Storage API (GORM tidak relevan di sini).

## Epic 9 — REST API Transport

**Tujuan:** transport kedua yang **reuse 100%** `core/` + `repository/postgres/`
dari MCP (lihat prinsip #4 di `ARCHITECTURE.md`). Baru mulai setelah MCP
server stabil (Phase 5 di roadmap eksekusi lama, tetap berlaku).

- Echo HTTP server scaffold
- Handler layer tipis (parsing + delegasi ke repository interface — no
  business logic, sama seperti aturan transport MCP)
- Auth middleware JWT/Google (beda total dari API-token MCP)
- CRUD endpoint menggantikan akses langsung frontend → Supabase (lihat
  `docs/ARCHITECTURE_V2.md` §8/§8a untuk kapan frontend boleh mulai migrasi)

## Epic 10 — AI Gateway Integration (opsional, defer)

`testify.issue.detectDuplicate` di Node manggil "existing ai-gateway
duplicate_issue_detection action" — servis eksternal yang **belum ada
konteksnya di repo Go ini**. Defer sampai ada keputusan produk soal AI
gateway; untuk MVP porting, tool ini boleh distub (return
"not implemented") tanpa memblokir epic lain.

---

## Non-goals (sengaja tidak masuk backlog ini)

- Redesain ulang domain model Testing (unchanged, lihat CLAUDE.md) — hanya
  porting transport/access layer, bukan mengubah aturan bisnis
- Auth Google OAuth untuk MCP — MCP pakai API token, bukan OAuth (itu
  urusan REST API / frontend, beda transport)
- Menghapus/mengganti `backend_archive/` — sudah diarsip, tidak disentuh
