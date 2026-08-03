# Backend Go — Task Breakdown (siap eksekusi per-agen)

Setiap task di bawah dibuat supaya bisa langsung diambil satu agen tanpa
perlu re-derive konteks — semua referensi file (baik di repo ini maupun di
`../../NvlFr-testify/`) sudah disebutkan eksplisit. Nomor task mengikuti
fase di [`ROADMAP.md`](./ROADMAP.md).

**Sebelum mulai task apa pun:** baca [`ARCHITECTURE.md`](./ARCHITECTURE.md)
(otoritas layering & konvensi kode) dan [`BACKLOG.md`](./BACKLOG.md) (epic
terkait). Task ini tidak mengulang aturan umum di sana.

**Konvensi umum semua task kode:**
- Ikuti pola row/mapper yang sudah ada di `repository/postgres/project_repo.go`
  (struct privat + `NewXxxRepo` + `toDomain()` + `TableName()`)
- `core/` tidak boleh import apa pun selain `context`, `time`, `errors`
- Setelah selesai: `go build ./...` dan `go vet ./...` harus bersih

---

## Fase 1 — Database Prasyarat

### T1.1 — Migration `api_tokens` ✅ DONE

**File:** `supabase/migrations/20260801131633_backend_api_tokens.sql`, plus
follow-up RPC `mint_api_token` (`20260802170708_api_tokens_mint_rpc.sql`,
`20260802171500_fix_mint_api_token_ambiguous_id.sql`) yang backing UI
"Agent Tokens" tab di frontend — resolusi asli file baru di bawah ini.

**File baru:** `supabase/migrations/<timestamp>_backend_api_tokens.sql`

**Referensi skema:** `../../NvlFr-testify/supabase/schema_019_p2_api_webhooks.sql`
baris 8–20 (hanya bagian `api_tokens`, bukan `webhooks` — belum dibutuhkan).

**Poin penting (jangan diubah dari referensi):**
- `scopes text[] not null default array['read:project']::text[]` — **bukan**
  CSV atau jsonb. Ini sudah dikonfirmasi cocok dengan fix di
  `repository/postgres/token_repo.go` (pakai `pq.StringArray`)
- `token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$')` —
  SHA-256 hex, cocok dengan `sha256Hex()` di `token_repo.go`
- `revoked_at timestamptz` nullable — dipakai `TokenRepo.Authenticate()`
  filter `revoked_at IS NULL`
- FK `project_id references projects(id) on delete cascade` — pastikan
  match dengan tabel `projects` yang **sudah ada** di repo ini (beda dari
  skema `created_by`/`owner_id` — cek migration
  `20260725000007_project_ownership_and_visibility.sql` di project ini
  untuk nama kolom FK yang benar jika referensi Node beda konvensi)
- FK `created_by references profiles(id)` di referensi Node — di project
  ini tabel identity adalah `profiles` (public) + `users` (privat, lihat
  CLAUDE.md §Auth & RBAC) — pastikan FK menunjuk ke `profiles(id)`, bukan
  `users(id)`, konsisten dengan pola tester/assignee lain di repo ini

**Acceptance:**
- `supabase db push --yes` sukses lokal
- Insert manual 1 row test token, `SELECT scopes FROM api_tokens` return
  array Postgres asli (bukan string)

### T1.2 — Migration `mcp_tool_rate_limits` + RPC governance ✅ DONE

**File:** `supabase/migrations/20260801140000_backend_mcp_governance.sql`

**Referensi:** `../../NvlFr-testify/supabase/schema_059_mcp_rate_limit_audit.sql`

**Yang di-port:**
- `mcp_tool_rate_limits` (PK token_id+tool_name+window_started_at, RLS,
  revoke dari public/anon/authenticated — internal-only, hanya dipakai RPC)
- `ai_audit_events` (dibuat di sini karena project ini belum punya migration
  AI-integration schema_023; hanya kolom yang dibutuhkan governance: project,
  tool_name, status started/completed/failed/rate_limited, latency, timestamps)
- RPC `mcp_begin_tool_call(p_token, p_project_id, p_tool_name, p_limit=120, p_window_seconds=60)`
  → `table(audit_id uuid, allowed boolean)` — validasi format token
  `^tm_[0-9a-f]{64}$` & tool `^testify\.[a-z0-9_]+\.[a-zA-Z0-9_]+$`, hash
  token via `extensions.digest`, upsert counter window `clock_timestamp()`
  floor, insert audit `started`/`rate_limited`, hapus window lama
- RPC `mcp_complete_tool_call(p_token, p_project_id, p_audit_id, p_status, p_latency_ms)`
  — hanya transisi `started` → `completed`/`failed`

**Acceptance:** ✅ RPC ditulis mengikuti referensi, ✅ `supabase db push`
terverifikasi (lihat `supabase migration list` — semua migration Fase 1-5.5
applied).

---

## Fase 2 — Repository Layer

### T2.1 — `TestCaseRepo`

**File baru:** `repository/postgres/testcase_repo.go`

**Interface yang harus diimplementasikan:** `core.TestCaseRepository`
(`core/ports.go` baris 15–22) — method `List`, `Get`, `Create`, `Update`,
`Duplicate`, `Archive`.

**Tabel:** `test_cases` + join `test_case_tags`/`tags` untuk field `Tags`
di `core.TestCase` (lihat `core/domain.go` baris 82–98). Kolom `steps` di
domain type ini adalah `[]TestCaseStep` terstruktur — cek apakah tabel
project ini simpan steps sebagai kolom terpisah `test_case_steps` (sesuai
CLAUDE.md domain model) atau kolom teks tunggal seperti skema historis
`supabase/schema.sql` root (usang) — **pakai `supabase/migrations/`
terbaru sebagai acuan, bukan asumsi dari referensi Node** (skema Node
`steps: string` tunggal berbeda dari domain model project ini yang punya
`StepType` simple/detailed).

**Referensi query pattern:** `../../NvlFr-testify/mcp/src/repositories/readRepository.ts`
(untuk `List`/`Get`/search filter) dan `writeRepository.ts` (untuk
`Create`/`Update`/`Duplicate`/`Archive`) — porting logic filter &
validasinya, bukan copy-paste SQL (beda ORM: Node pakai PostgREST query
builder, Go pakai GORM).

**Acceptance:** `go build ./...` bersih, minimal test `List` dengan filter
kosong return semua test case project tertentu.

### T2.2 — `TestPlanRepo`

**File baru:** `repository/postgres/testplan_repo.go`

**Interface:** `core.TestPlanRepository` (`core/ports.go` baris 24–31) —
`List`, `Get`, `Create`, `AddCases`, `RemoveCases`, `Approve`.

**Tabel:** `test_plans` + junction `test_plan_cases` (CLAUDE.md: junction
ini **hanya** "test case mana masuk plan", tanpa kolom hasil — jangan
tambahkan kolom result di sini meski referensi Node mungkin beda).

**Referensi:** `readRepository.ts`/`writeRepository.ts` bagian test plan.

**Acceptance:** `AddCases`/`RemoveCases` idempotent (panggil dua kali
dengan case_id sama tidak error/duplikat).

### T2.3 — `TestRunRepo`

**File baru:** `repository/postgres/testrun_repo.go`

**Interface:** `core.TestRunRepository` (`core/ports.go` baris 33–40) —
`List`, `Get`, `Create`, `RecordResult`, `Complete`, `Summary`.

**Aturan domain (CLAUDE.md, wajib dipatuhi, ini beda dari sekadar port
Node):**
- `Create` **selalu** insert Test Run baru + seed `test_results` status
  `not_run` untuk tiap case di plan — **tidak pernah** update/reuse run lama
- `Complete` murni set status, **tidak boleh** ada logic yang infer
  completion otomatis dari semua result terisi
- `Summary` **selalu** hitung on-the-fly dari `test_results` (agregasi
  query saat dipanggil) — **jangan** simpan sebagai kolom cache di tabel
  manapun, walaupun untuk optimasi

**Referensi:** `readRepository.ts` (list/get/summary), `writeRepository.ts`
(create/recordResult/complete).

**Acceptance:** test yang membuktikan run baru tidak menimpa `test_results`
dari run sebelumnya (dua run berbeda untuk plan yang sama, hasil independen).

### T2.4 — `IssueRepo`

**File baru:** `repository/postgres/issue_repo.go`

**Interface:** `core.IssueRepository` (`core/ports.go` baris 42–47) —
`List`, `Get`, `Create`, `UpdateStatus`.

**Aturan domain:** Issue 1:many terhadap Test Result (CLAUDE.md) — `Create`
wajib menerima `TestResultID` (sudah ada di `core.CreateIssueInput` baris
140–148) dan tidak boleh dibuat tanpa itu.

**Referensi:** `readRepository.ts`/`writeRepository.ts` bagian issue,
`governanceRepository` **tidak relevan** di sini (itu Epic 4, jangan
dicampur ke task ini).

**Acceptance:** `Create` gagal (error, bukan silent) kalau `TestResultID`
tidak valid/tidak ada.

### T2.5 — Tambah port `Module`, `Tag`, `TestRole`

**File yang diubah:** `core/ports.go` (tambah interface baru),
`core/domain.go` (jika perlu field tambahan — `Module` sudah ada di
domain.go baris 40–45, cek `Tag`/`TestRole` belum ada, perlu ditambah).

**File baru:** `repository/postgres/module_repo.go`,
`repository/postgres/tag_repo.go`, `repository/postgres/testrole_repo.go`.

**Kenapa dibutuhkan sekarang:** `testcase.search` (T3.2) butuh filter
by module name/tag name (bukan cuma UUID) — lihat
`readTools.ts` baris 39-41 (`module_id` **dan** `module` nama bebas,
`tag` nama bebas) — perlu repo untuk resolve nama → id.

**Acceptance:** `TestRoleRepo` sesuai CLAUDE.md — ini role **aplikasi yang
ditest** (mis. "Admin", "Manager"), bukan role TestManager platform,
jangan tertukar dengan `project_members.role`.

---

## Fase 3 — MCP Read Tools

### T3.1 — Wire `mark3labs/mcp-go` stdio server

**File yang diubah:** `go.mod` (tambah dependency), `mcp-server/cmd/main.go`
(ganti placeholder `fmt.Println(...)` baris 63 + `_ = registrars` baris 61
dengan wiring sungguhan).

**Referensi API:** dokumentasi `github.com/mark3labs/mcp-go` — cek versi
terbaru stabil, project Node pakai `@modelcontextprotocol/sdk` resmi tapi
Go pakai library komunitas berbeda (`mark3labs/mcp-go`), jadi **API shape
tidak akan sama persis** dengan pola `server.registerTool(...)` di Node —
jangan coba samakan literal, sesuaikan ke idiom Go library ini.

**Acceptance:** `go run ./mcp-server/cmd` dengan `TM_API_TOKEN`/`TM_PROJECT_ID`
valid start tanpa crash dan menerima koneksi stdio dari MCP client (uji
manual dengan Claude Desktop config atau `mcp-go`'s test client jika ada).

### T3.2 — Implementasi 11 read tool inti

**File yang diubah:** `mcp-server/internal/tools/read_tools.go` (ganti
`Register()` yang sekarang return `nil` di baris 41, hapus pseudo-code
comment baris 26-40 setelah implementasi nyata ada).

**Tool list lengkap + referensi 1:1 ke Node** (`../../NvlFr-testify/mcp/src/tools/readTools.ts`):

| Go tool name | Baris referensi Node | Repo dipakai |
|---|---|---|
| `testify.project.list` | readTools.ts:16-23 | `Repos.Project` |
| `testify.project.get` | readTools.ts:25-34 | `Repos.Project` |
| `testify.testcase.search` | readTools.ts:36-61 | `Repos.TestCase` + T2.5 |
| `testify.testcase.get` | readTools.ts:63-72 | `Repos.TestCase` |
| `testify.testplan.list` | readTools.ts:74-80 | `Repos.TestPlan` |
| `testify.testplan.get` | readTools.ts:81-86 | `Repos.TestPlan` |
| `testify.testrun.list` | readTools.ts:87-94 | `Repos.TestRun` |
| `testify.testrun.get` | readTools.ts:95-100 | `Repos.TestRun` |
| `testify.testresult.list` | readTools.ts:101-108 | *(butuh `TestResultRepo` baru — belum ada port, tambahkan ke `core/ports.go` di task ini)* |
| `testify.issue.search` | readTools.ts:109-118 | `Repos.Issue` |
| `testify.issue.get` | readTools.ts:119-121 | `Repos.Issue` |

Requirement tools (`readTools.ts:122-133`) dan `artifact.get_url`
(`readTools.ts:134-138`) **sengaja tidak masuk task ini** — itu Fase 6
(butuh migration tabel baru dulu).

**Validasi input:** Node pakai Zod (`z.string().uuid()`, `z.enum([...])`,
dst) — Go tidak punya runtime validator built-in setara; putuskan salah
satu: validasi manual di handler, atau adopsi library seperti
`go-playground/validator`. Dokumentasikan pilihan di komentar kode karena
akan dipakai berulang di semua tool berikutnya.

**Acceptance:** setiap tool bisa dipanggil dari MCP client, hasil field
JSON (`json` tag di `core/domain.go`) cocok dengan ekspektasi konsumen
(camelCase, sesuai konvensi domain type project ini).

### T3.3 — Cursor pagination

**File yang diubah:** kemungkinan file baru `core/cursor.go` atau taruh di
masing-masing repo — putuskan saat implementasi, konsisten dengan pola
`core.PageResult[T]` yang sudah ada (`core/domain.go` baris 233-238).

**Referensi:** `../../NvlFr-testify/mcp/src/services/readService.ts` —
cari fungsi `encodeTestCaseCursor`, `encodeCodeCursor`,
`encodeRequirementCursor`, `encodeTestResultCursor` — pahami skema
encoding cursor mereka (base64 dari kolom apa) sebelum desain versi Go,
supaya konsisten kalau suatu saat frontend REST API perlu cursor yang sama.

**Acceptance:** page kedua tidak pernah mengembalikan row yang sama dengan
page pertama, walaupun ada insert baru di antara dua request (stable
cursor, bukan offset yang bisa skip/duplikat).

---

## Fase 4 — Write Tools + Governance

### T4.1 — File baru `write_tools.go` — ✅ DONE (2026-08-01)

**File baru:** `mcp-server/internal/tools/write_tools.go`

**Referensi 1:1:** `../../NvlFr-testify/mcp/src/tools/writeTools.ts` (12
tool, baris 16-53) — tabel mapping lengkap ada di `BACKLOG.md` Epic 3,
jangan diulang di sini, tapi **wajib baca kolom "Catatan porting" di sana**
sebelum implementasi, terutama soal human-gate `testplan.approve` dan
aturan `testrun.create` yang tidak boleh overwrite run lama.

**Acceptance:** `testmanager.testplan.approve` versi Node menolak call
tanpa `explicit_approval: true` literal (Zod `z.literal(true)`) — versi Go
harus punya penolakan setara, tulis sebagai test case eksplisit
(`TestApproveTestPlan_RejectsWithoutExplicitApproval` atau serupa).

**Catatan implementasi:**
- 13 tool terdaftar (bukan 12): createBulk/update/duplicate/archive test
  case, create/addCases/removeCases/approve test plan,
  create/recordResult/complete test run, create/updateStatus issue.
- `issue.comment` dan `issue.detectDuplicate` di-defer dari Fase 4 —
  `issue.comment` butuh migration tabel `issue_comments` yang belum ada,
  `issue.detectDuplicate` butuh AI gateway (Fase 8). Ini sesuai catatan
  `BACKLOG.md` Epic 3.
- Semua write non-human-gate dibungkus `reviewOnly()` →
  `{status:"draft", mode:"review_only", data}` setara `writeService.ts`.
- Human-gate: `approveTestPlan` menolak semua kecuali literal JSON `true`
  (`boolLiteral` menolak string `"true"`/number) + wajib `approver_id` UUID;
  `completeTestRun` manual-only (tidak pernah inferred).
- Validasi input manual (tanpa library validator, konsisten T3.2); batch
  `createBulk`/`addCases`/`removeCases` di-clamp ke 100.

### T4.2 — Governance middleware (rate-limit + audit) — ✅ DONE

**File baru:** `mcp-server/internal/governance/` — `repository.go`
(interface `Repository` + `BeginResult` + `SessionResolver`),
`postgres.go` (`PostgresRepository`, RPC via `db.Raw`),
`service.go` (`Service.Wrap`: begin → `!allowed` → `ErrRateLimited` →
handler → complete `completed`/`failed` + latency clamp),
`server.go` (`Server` membungkus `AddTool`, setara `installToolGovernance`).

**File yang diubah:** `registry.go` (interface `ToolAdder` menggantikan
`*server.MCPServer` di `Register`), `read_tools.go`/`write_tools.go`
(signature `Register(ToolAdder)`), `cmd/main.go` + `cmd-http/main.go`
(wiring via env `TM_MCP_GOVERNANCE=1`, `TM_TOOL_RATE_LIMIT` default 120,
`TM_TOOL_RATE_LIMIT_WINDOW_SECONDS` default 60), `auth/session.go`
(field `RawToken` memory-only untuk RPC).

**Referensi:** `../../NvlFr-testify/mcp/src/repositories/governanceRepository.ts`
(RPC call shape — `beginToolCall`/`completeToolCall`) dan
`../../NvlFr-testify/mcp/src/tools/registry.ts` baris 34-46
(`installToolGovernance` — pola wrap semua tool handler tanpa tiap tool
tahu soal governance, murni middleware).

**Dependency:** T1.2 ✅ (migration ditulis; `supabase db push` pending).

**Acceptance:** ✅ 11 unit test di `governance_test.go`: allowed,
rate-limited (tanpa complete call — row `rate_limited` ditulis RPC begin),
handler-error→`failed`, `IsError`→`failed`, resolver/begin/complete error,
latency clamp, `WithRateLimit`, semua handler ter-govern lewat `Server`.
Coverage package: service 95-100%, `postgres.go` butuh DB nyata (0%, sama
pola postgres repo lain).

### T4.3 — Project-scope recursive guard — ✅ DONE (2026-08-01)

**File yang diubah:** `mcp-server/internal/auth/session.go` (tambah method
setara `assertToolArguments`/`inspectProjectReferences`).

**Referensi:** `../../NvlFr-testify/mcp/src/services/authService.ts` baris
38-56 — logic rekursif jalan-jalan ke semua nested field cari
`project_id`/`projectId`, tolak kalau tidak match session.

**Acceptance:** test dengan payload nested (mis. array of object berisi
`project_id` field di dalamnya) yang project_id-nya beda dari session →
harus ditolak, bukan lolos karena hanya cek top-level.

**Catatan implementasi:** `Session.AssertProjectReferences` walk args
rekursif (`map[string]any` → object, `[]any` → elemen), cek key
`project_id`/`projectId`, tolak non-string maupun mismatch. Dipanggil di
`WriteTools.beginWrite` untuk semua write handler. Unit test:
`TestAssertProjectReferences_*` di `session_test.go` (9 kasus).

### T4.4 — Aktifkan write tools di registry — ✅ DONE (2026-08-01)

**File yang diubah:** `mcp-server/internal/tools/registry.go` baris 37-39
(uncomment `&WriteTools{r}`, dst — sesuaikan nama struct final dari T4.1).

**Acceptance:** `TM_MCP_READONLY=1` tetap **tidak** mendaftarkan write
tools (sudah dijamin oleh `ReadOnly()` vs `Full()` yang ada, cukup pastikan
tidak regresi).

**Catatan implementasi:** `&WriteTools{r}` di-uncomment di `Registry.Full()`.
`ReadOnly()` tidak berubah — write tools hanya muncul di Full mode.
Unit test `TestWriteToolsRegister` (13 tool via MCPServer nyata).

---

## Fase 5 — Automation, Analysis, Repo Tools

### T5.1 — Migration automation tables

**File baru:** `supabase/migrations/<timestamp>_backend_automation.sql`

**Referensi:** `../../NvlFr-testify/supabase/schema_024_p3_automation.sql`
— baca lengkap sebelum port, port apa adanya kecuali ada FK yang perlu
disesuaikan ke skema `profiles`/`users` split project ini (sama seperti
catatan di T1.1).

### T5.2 — Automation tools (5 tool)

**File baru:** `mcp-server/internal/tools/automation_tools.go`

**Referensi:** `../../NvlFr-testify/mcp/src/tools/automationTools.ts`
(baris 13-14 read, 19-21 write) — perhatikan `rerunFailed` (baris 21) juga
human-gate seperti `testplan.approve`: di atas safety limit wajib
`confirmed_by` + `explicit_confirmation`, bukan langsung jalan.

**Dependency:** T5.1, T4.2 (governance sudah harus membungkus tool baru
ini juga).

### T5.3 — Analysis tools (3 tool)

**File baru:** `mcp-server/internal/tools/analysis_tools.go`

**Referensi:** `../../NvlFr-testify/mcp/src/tools/analysisTools.ts`.

**Aturan domain:** `run_summary` **selalu** on-demand, sama seperti
`TestRunRepo.Summary` di T2.3 — jangan cache.

### T5.4 — Migration `project_repositories`

**File baru:** `supabase/migrations/<timestamp>_backend_project_repositories.sql`

**Referensi:** `../../NvlFr-testify/supabase/schema_029_project_repositories.sql`

### T5.5 — Repo tools (4 tool) — ✅ selesai

**Riset:** dibaca lengkap `../../NvlFr-testify/mcp/src/repositories/repoRepository.ts`,
`services/repoService.ts`, `tools/repoTools.ts`, dan
`schema_057_mcp_repo_tools.sql`. **Keputusan:** git CLI via `os/exec` (tanpa
dependency Go baru — pola minimal-dep proyek), checkout lokal di cache dir
(`TM_REPOSITORY_CACHE_DIR`, default `os.TempDir()/testify-repos`), URL remote
dipaksa credential-free (SSH URL ditolak), credential Vault dikirim sebagai
`http.extraHeader` Basic auth. Kredensial didekripsi server-side di SQL via
`vault.decrypted_secrets`, tidak pernah keluar dari Postgres.

**File baru:** `mcp-server/internal/tools/repo_tools.go` (+`repo_tools_test.go`),
`service/repo_service.go`, `repository/postgres/repo_repo.go`, port
`core.RepoRepository` di `core/ports.go`, tipe domain
`ProjectRepositoryConfig`/`RepoFileChange`/`RepoDiff`/`RepoListFilesResult`/
`RepoReadFileResult`/`RepoMatch`/`RepoSearchResult` di `core/domain.go`.

**Tool:** `testify.repo.list_files` / `read_file` / `search` / `diff` (read-only,
idempotent). Batas dipertahankan dari Node: path ≤1000, limit 1–100 (list 100,
search 50), read ≤128 KiB, patch diff dipotong 192 KiB, search literal via
`git grep -F` (exit code 1 = 0 hasil, bukan error), scope dibatasi ke
`subdirectory` terkonfigurasi dengan containment realpath (path escape
ditolak).

**Test:** real git repo di `t.TempDir()` (`local_path` mode) — valid/truncated/
no-match/diff; validasi UUID, limit, path-escape, unsafe URL & revision;
registrasi 4 tool.

---

## Fase 6 — Requirement Tools + Artifact Storage

### T6.1 — Migration `requirements`/`requirement_links`

**Referensi:** `../../NvlFr-testify/supabase/schema_015_requirement_traceability.sql`

### T6.2 — `RequirementRepo`

**File baru:** `repository/postgres/requirement_repo.go` + port baru di
`core/ports.go`.

### T6.3 — 3 requirement tool

**Referensi:** `readTools.ts` baris 122-133 (`requirement.list`/`get`/`coverage`).

### T6.4 — `testify.artifact.getUrl`

**Referensi:** `readTools.ts` baris 134-138. Putuskan: Supabase Go client
resmi vs REST call manual ke Storage API — dokumentasikan pilihan.

---

## Fase 7 — REST API

Task detail sengaja **belum** dipecah sedetail fase lain — tulis breakdown
task Fase 7 setelah Fase 2-6 selesai dan pola repository/service sudah
terbukti stabil lewat MCP, supaya tidak menebak kebutuhan REST endpoint
sebelum ada pemakaian nyata. Lihat `ROADMAP.md` Fase 7 untuk garis besar.

---

## Fase 8 — AI Gateway (defer)

Task detail menunggu keputusan produk (`ROADMAP.md` T8.1). Untuk sekarang,
`testify.issue.detectDuplicate` di T4.1 cukup di-stub return error
"not implemented", **jangan** panggil layanan eksternal yang belum
terdefinisi kontraknya.
