# Backend Go — Roadmap Eksekusi

Fase eksekusi untuk backlog di [`BACKLOG.md`](./BACKLOG.md). Setiap fase
punya exit criteria yang jelas supaya beberapa agen bisa mengambil task
secara paralel tanpa saling menunggu tanpa alasan, tapi tetap menghormati
dependency nyata (migration harus ada sebelum repository yang
memakainya, dst).

Status per fase: `todo` / `in_progress` / `blocked` / `done`. Update status
ini setiap kali sebuah fase selesai atau berubah kondisi.

**Sebelum masuk Fase 1 penuh:** lihat [`VALIDATION.md`](./VALIDATION.md) —
spike tercepat (1 migration + 1 MCP tool + 1 REST endpoint, reuse
`ProjectRepo` yang sudah ada) untuk membuktikan shared-core architecture
bekerja end-to-end sebelum investasi porting 42 tool penuh. Fase 1-8 di
bawah adalah cakupan lengkap setelah spike itu hijau.

---

## Fase 0 — Perbaikan Scaffold (✅ done — 2026-08-01)

Bug kompilasi & mismatch tipe di scaffold awal sudah diperbaiki:
- Import collision `postgres` di `mcp-server/cmd/main.go`
- Tipe timestamp (`string` → `time.Time`) di `project_repo.go`, `token_repo.go`
- `api_tokens.scopes` disamakan ke `pq.StringArray` (`text[]`), sesuai skema
  referensi Node, bukan CSV
- `go build ./...` dan `go vet ./...` bersih

**Exit criteria:** ✅ terpenuhi — backend bisa di-build tanpa error.

---

## Fase 1 — Database Prasyarat (P0)

**Blocker untuk semua fase lain.** Tanpa `api_tokens`, `auth.Load()` tidak
bisa jalan sama sekali — tidak ada tool yang bisa dites end-to-end.

- [ ] T1.1 — Migration `api_tokens` (BACKLOG Epic 6)
- [ ] T1.2 — Migration `mcp_tool_rate_limits` + RPC `mcp_begin_tool_call`/
      `mcp_complete_tool_call` (BACKLOG Epic 4/6)

**Exit criteria:** `supabase db push` sukses, tabel `api_tokens` dan
`mcp_tool_rate_limits` ada di database, minimal satu token dummy bisa
di-insert manual untuk testing Fase 2.

**Boleh paralel dengan:** Fase 2 (repository layer tidak butuh tabel ini
untuk *ditulis*, hanya untuk *dites* end-to-end) — tapi T1.1 sebaiknya
dikerjakan lebih dulu karena setiap agen lain butuh cara auth untuk smoke
test manual.

---

## Fase 2 — Repository Layer Lengkap (P0)

Melengkapi `repository/postgres/` untuk semua entity Testing Domain inti
(Project sudah ada dan sudah diperbaiki di Fase 0).

- [x] T2.1 — `TestCaseRepo` (`core.TestCaseRepository`)
- [x] T2.2 — `TestPlanRepo` (`core.TestPlanRepository`)
- [x] T2.3 — `TestRunRepo` (`core.TestRunRepository`)
- [x] T2.4 — `IssueRepo` (`core.IssueRepository`)
- [x] T2.5 — Tambah port + repo `ModuleRepo`, `TagRepo`, `TestRoleRepo` ke
      `core/ports.go` (belum ada portnya sama sekali)

**Dependency:** tidak butuh Fase 1 selesai untuk menulis kode, tapi butuh
`DATABASE_URL` valid + tabel domain (`test_cases`, dll — **sudah ada**,
lihat `ARCHITECTURE.md` §Database) untuk testing.

**Exit criteria:** `go build ./...` clean, setiap repo punya minimal satu
unit/integration test yang jalan terhadap DB nyata (atau testcontainer),
`main.go` tidak lagi punya `nil` di `tools.Repos{}`.

**Boleh paralel:** T2.1–T2.5 independen satu sama lain (file terpisah,
tidak saling import) — bisa 4-5 agen paralel.

---

## Fase 3 — MCP Read Tools + Wiring Protokol (P0)

- [x] T3.1 — `go get github.com/mark3labs/mcp-go`, wire stdio server
      sungguhan di `main.go` (saat ini hanya `fmt.Println` placeholder)
- [x] T3.2 — Implementasi 11 read tool inti (project, testcase, testplan,
      testrun, testresult, issue — lihat BACKLOG Epic 2 tabel) di
      `read_tools.go`, ganti stub `Register()` yang sekarang return `nil`
- [x] T3.3 — Pola cursor pagination setara Node (`encodeXxxCursor`) untuk
      `core.PageResult[T]`

**Dependency:** Fase 2 (butuh repo asli, bukan `nil`), Fase 1 (butuh
`api_tokens` untuk smoke test via `TM_API_TOKEN`).

**Exit criteria:** end-to-end manual test sukses —
`TM_API_TOKEN=... TM_PROJECT_ID=... TM_MCP_READONLY=1` jalan, tool
`testify.project.list` → `testify.testcase.search` → `testify.testrun.get`
bisa dipanggil dari MCP client (mis. Claude Desktop/Code) dan hasilnya
benar.

**Ini adalah milestone yang disebut eksplisit di `ARCHITECTURE.md` Phase 2**
— jangan lanjut ke write tools sebelum ini hijau.

---

## Fase 4 — MCP Write Tools + Governance Middleware (P1)

- [x] T4.1 — File baru `write_tools.go`, 13 write tool (BACKLOG Epic 3;
      `issue.comment` dan `issue.detectDuplicate` di-defer — butuh migration
      `issue_comments` / AI gateway). Semua write non-human-gate dibungkus
      review-only draft `{status:"draft", mode:"review_only", data}`.
      `testplan.approve` menolak call tanpa literal `explicit_approval:true`
      + `approver_id`; `testrun.complete` manual-only.
- [ ] T4.2 — Governance middleware: rate-limit + audit wrapper di sekitar
      setiap tool call (BACKLOG Epic 4, pola `installToolGovernance` Node)
      — **blocked** oleh T1.2 (migration `mcp_tool_rate_limits` + RPC belum ada)
- [x] T4.3 — Project-scope recursive guard (`assertToolArguments` Node) —
      `Session.AssertProjectReferences` di `session.go`, walk args rekursif
      ke object/array, cek `project_id`/`projectId` terhadap scope session
- [x] T4.4 — Aktifkan `&WriteTools{r}` di `registry.go` (Full mode)

**Dependency:** Fase 3 selesai (pola tool handler sudah teruji), Fase 1
T1.2 (tabel rate-limit untuk T4.2).

**Exit criteria:** human-gate tools (`testplan.approve`, `testrun.complete`,
`automation.rerunFailed` di atas limit) **menolak** call tanpa konfirmasi
eksplisit — ini harus ditulis sebagai test case, bukan cuma manual check.
✅ `TestApproveTestPlan_RejectsWithoutExplicitApproval` (4 varian argumen
gagal) + `TestApproveTestPlan_WithExplicitApproval` di `write_tools_test.go`.

---

## Fase 5 — Automation, Analysis, Repo Tools (P1/P2)

- [ ] T5.1 — Migration `automation_scripts`/`automation_jobs`/`automation_runners`
- [ ] T5.2 — 5 automation tool (BACKLOG Epic 5)
- [ ] T5.3 — 3 analysis tool (BACKLOG Epic 5)
- [ ] T5.4 — Migration `project_repositories`
- [ ] T5.5 — 4 repo tool (BACKLOG Epic 7) — **butuh riset dulu** cara Node
      mengakses source code (git checkout lokal vs API eksternal) sebelum
      desain Go-nya, jangan asumsikan

**Dependency:** Fase 4 (governance middleware harus sudah membungkus semua
tool, termasuk yang baru).

**Boleh paralel:** T5.1+T5.2+T5.3 (automation+analysis) independen dari
T5.4+T5.5 (repo tools) — dua sub-tim bisa jalan bersamaan.

---

## Fase 6 — Requirement Tools + Artifact Storage (P2)

- [ ] T6.1 — Migration `requirements`, `requirement_links`
- [ ] T6.2 — `RequirementRepo` + port di `core/ports.go`
- [ ] T6.3 — 3 requirement tool (list/get/coverage)
- [ ] T6.4 — `testify.artifact.getUrl` (signed URL Supabase Storage)

**Dependency:** Fase 3 (pola read tool sudah mapan).

---

## Fase 7 — REST API Transport (P2, setelah MCP stabil)

- [ ] T7.1 — Echo HTTP server scaffold di `rest-api/`
- [ ] T7.2 — Handler layer tipis, reuse `repository/postgres/` yang sama
      dengan MCP (tidak ada repo/service baru)
- [ ] T7.3 — Auth middleware JWT/Google (beda total dari API-token MCP)
- [ ] T7.4 — CRUD endpoint dasar (project, testcase, testplan minimal)

**Dependency:** Fase 2–6 selesai (semua repository sudah teruji lewat MCP
sebelum dipakai transport kedua) — sesuai prinsip `ARCHITECTURE.md`:
"Implementasi menunggu MCP server stabil."

**Tidak diblokir oleh:** Epic AI Gateway (Fase 8) — REST API tidak butuh itu.

---

## Fase 8 — AI Gateway Integration (P3, opsional/defer)

- [ ] T8.1 — Keputusan produk: apakah AI gateway eksternal ini dibangun di
      repo ini atau tetap layanan terpisah
- [ ] T8.2 — `testify.issue.detectDuplicate` implementasi nyata
      (menggantikan stub "not implemented" dari Fase 4)

**Dependency:** tidak memblokir fase manapun — boleh dikerjakan kapan saja
setelah keputusan produk ada, termasuk paralel dengan Fase 7.

---

## Ringkasan urutan wajib (dependency chain)

```
Fase 0 (done) → Fase 1 ─┬─────────────► Fase 3 → Fase 4 → Fase 5 ─┐
                Fase 2 ──┘                          │              ├─► Fase 7
                                                     └──► Fase 6 ───┘
                                                     Fase 8 (kapan saja, tidak memblokir)
```

Fase 1 dan Fase 2 boleh paralel. Fase 3 butuh keduanya selesai. Setelah
Fase 3 hijau (milestone: 3 tool read end-to-end via MCP client), Fase 4–6
sebagian besar independen satu sama lain dan bisa dibagi ke agen berbeda.
Fase 7 menunggu semuanya. Fase 8 tidak menghalangi apa pun.
