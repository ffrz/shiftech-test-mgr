# Roadmap — Backend Go Service Parity, REST API, dan Frontend Switch (V3)

Kelanjutan dari [`backend/ROADMAP.md`](../backend/ROADMAP.md) Fase 1-5.5 (repository +
MCP tools sudah ada dan teruji). V3 ini menjawab pertanyaan lanjutan: *service Go saat
ini cuma passthrough tipis ke repository — belum meniru business rule yang sudah lama
hidup di `frontend/src/services/*.ts` (activity log, notifikasi, validasi lintas
entity)*. Tujuannya bukan menulis ulang dari nol, tapi **port logic yang sudah terbukti
benar di frontend ke Go**, supaya kontraknya jadi satu (service Go), lalu REST API dan
akhirnya frontend sendiri bisa memakainya — bukan Supabase langsung.

Status legend: `todo` · `in-progress` · `done` · `blocked`

**Sebelum masuk fase manapun di sini:** baca `backend/ARCHITECTURE.md` (layering) dan
`backend/ROADMAP.md` Fase 5.5 (kenapa `IssueService`/`TestRunService` sudah punya
`Inspect`/`CanClose`/`GetWithDetail` — pola yang sama dipakai untuk service baru di
roadmap ini). CLAUDE.md project (root) tetap otoritas untuk domain model & aturan yang
tidak boleh dilanggar (mis. summary run selalu on-the-fly, test run baru tidak pernah
menimpa run lama).

---

## Kenapa roadmap ini ada

MCP server sudah lewat service layer dengan benar (`MCP → Service → Repository → DB`),
tapi service Go itu sendiri masih **passthrough** — cuma meneruskan panggilan ke
repository tanpa business rule tambahan. Business rule itu sudah ada dan sudah lama
dipakai di production oleh frontend (`frontend/src/services/issueService.ts`,
`testRunService.ts`, dst) — misalnya:

- `issueService.changeStatus` mencatat activity **hanya kalau status benar-benar
  berubah**, lalu mengirim notifikasi ke assignee (kalau beda dari aktor)
- `activityService.addComment` mem-parsing `@mention` dan mengirim notifikasi ke user
  yang disebut
- Aturan run/plan/test-case lain yang sudah divalidasi lewat pemakaian nyata di UI

Kalau MCP/REST cuma pakai repository mentah (atau service Go yang masih tipis), agent
AI dan API eksternal akan mendapat behavior yang **lebih lemah** dari yang didapat user
lewat UI — inkonsistensi yang justru bikin dua "sumber kebenaran" berbeda. Roadmap ini
menutup gap itu, satu domain di satu waktu, supaya begitu selesai, **frontend sendiri
bisa pindah dari Supabase langsung ke REST API tanpa kehilangan behavior apa pun**
(karena REST cuma re-expose service Go yang sudah menjadi tempat business rule hidup).

---

## Phase Overview

| Fase | Tujuan | Depends on | Status |
|---|---|---|---|
| G1 | `ActivityRepository` dapat method tulis (`Record`) + Go port `activityService.logEvent` | `backend/ROADMAP.md` Fase 5.5 | ✅ done |
| G2 | `NotificationRepository` baru di Go (belum ada sama sekali) + port `notificationService.create` | G1 (dipakai bareng activity di alur yang sama) | ✅ done |
| G3 | `IssueService` full parity: `UpdateStatus`/`Assign` meniru `issueService.ts` persis (actor wajib, activity + notifikasi). `BulkChangeStatus` sengaja tidak diport (belum ada kebutuhan nyata) | G1, G2 | ✅ done |
| G4 | `TestRunService`/`TestPlanService`/`TestCaseService` parity check — audit satu per satu apakah versi frontend punya business rule yang belum ada di Go | G1, G2 | ✅ done |
| G5 | `ActivityService.addComment` (dengan `@mention` parsing) — kalau MCP/REST butuh comment, bukan cuma system event | G1, G2 |
| R1 | REST API: endpoint issue (list/get/create/update/updateStatus/assign) di atas service yang sudah full-parity | G3 |
| R2 | REST API: endpoint test case/test plan/test run mengikuti pola yang sama | G4, R1 |
| R3 | REST API: auth transport (sesi login user asli — Google OAuth token verification — bukan API token seperti MCP) | R1 |
| F1 | Frontend: repository layer baru (`*Repository.ts`) yang manggil REST, di belakang flag/env, **tidak menghapus jalur Supabase dulu** | R1, R2, R3 |
| F2 | Frontend: pindahkan satu modul percobaan (Issue) sepenuhnya ke REST, uji golden path penuh | F1 |
| F3 | Frontend: migrasi modul sisanya (Test Case/Plan/Run, Project, Membership, dst) satu per satu | F2 |
| F4 | Hapus jalur Supabase langsung dari frontend, `@supabase/supabase-js` cuma dipakai untuk Auth (Google OAuth), bukan data | F3 |

**Prinsip tiap fase:** setiap fase harus bisa berhenti dengan aman di titik itu — tidak
ada fase yang meninggalkan `go build`/`go test`/`npm run build` merah. Ini pelajaran
dari sesi sebelumnya yang berhenti di tengah karena signature constructor berubah tanpa
test-nya ikut diperbarui (lihat `backend/ROADMAP.md` Fase 5.5).

---

## Fase G1 — Activity write path (`done` — 2026-08-03)

**Catatan:** ternyata sudah ada sebelum roadmap ini ditulis —
`core.ActivityRepository.Create` + `repository/postgres/activity_repo.go`
sudah insert ke `entity_activity`, dan `IssueService.UpdateStatus` sudah
memanggilnya. Detail asli di bawah ini dipertahankan sebagai referensi.

**Kenapa duluan:** ini akar masalah spesifik yang dilaporkan (MCP `issue.updateStatus`
berhasil ubah status tapi tidak tercatat di activity).

**Yang perlu dibuat:**
- `core.ActivityRepository` tambah method `Record(ctx, input) (*ActivityEntry, error)`
  — bentuk `input` meniru parameter `activityRepository.create` di frontend
  (`projectId`, `entityType`, `entityId`, `actorId`, `eventType`, `payload`,
  `parentCommentId?`).
- Implementasi di `repository/postgres/activity_repo.go` — insert ke `entity_activity`,
  tabel yang sama yang sudah dibaca `ListForEntity`.
- **Tidak port `addComment`/mention parsing di sini** — itu Fase G5, di luar scope
  "activity untuk status change".

**Referensi:** `frontend/src/services/activityService.ts:77-86` (`logEvent`) —
port method ini, bukan `addComment`.

**Exit criteria:** `go build ./...` + `go test ./...` bersih, ada test yang
membuktikan `Record` menulis row baru dan bisa dibaca kembali lewat `ListForEntity`.

---

## Fase G2 — Notification write path (`done` — 2026-08-03)

**Implementasi:** `core.NotificationRepository`/`core.CreateNotificationInput`
(`core/ports.go`, `core/domain.go`) + `repository/postgres/notification_repo.go`
(panggil RPC `create_notification` yang sudah ada di Supabase, sama seperti
frontend — tidak reimplementasi insert-nya di Go) + `service/notification_service.go`
tipis. Wired ke `IssueContextSources.Notifications` di `cmd/main.go` dan
`cmd-http/main.go`.

**Kenapa perlu:** `issueService.changeStatus`/`assign` di frontend selalu mengirim
notifikasi ke assignee (kalau beda dari aktor) — kalau Go tidak port ini, agent AI yang
mengubah status/assignee lewat MCP tidak pernah memicu notifikasi user, padahal user
lewat UI selalu dapat.

**Yang perlu dibuat:**
- `core.NotificationRepository` — interface baru di `core/ports.go` (belum ada sama
  sekali di backend Go, dicek eksplisit — lihat catatan di percakapan sebelum roadmap
  ini ditulis).
- `core.Notification` — domain type, samakan field dengan tabel `notifications` yang
  sudah ada di Supabase (`type`, `title`, `body`, `referenceType`, `referenceId`,
  `isRead`) — lihat CLAUDE.md §Notifications untuk kontrak tabelnya, **jangan** desain
  ulang skema, cuma port ke Go.
- Implementasi Postgres: `repository/postgres/notification_repo.go`.
- **RPC `create_notification` yang sudah ada di Supabase (dipakai frontend) TETAP
  dipakai** kalau paling sederhana — atau insert langsung dari Go kalau RPC itu cuma
  wrapper tipis. Putuskan saat implementasi, dokumentasikan pilihannya (pola yang sama
  seperti keputusan T5.5 repo tools soal kredensial Vault).

**Referensi:** `frontend/src/services/notificationService.ts` (cek dulu isinya saat
eksekusi — belum dibaca di sesi diskusi ini).

**Exit criteria:** ada service kecil `NotificationService.Create` + test yang
membuktikan pemanggilan insert row baru dengan field yang benar.

---

## Fase G3 — `IssueService` full parity (`done` — 2026-08-03)

**Implementasi:**
- `IssueService.UpdateStatus` — sudah punya activity log (dari sebelum roadmap
  ini), ditambah notifikasi ke assignee lama (kalau ada dan beda dari actor),
  meniru `issueService.changeStatus` persis.
- `IssueService.Assign` (baru) — `core.IssueRepository.Assign` port + repo
  (`issue_repo.go`) + service method: log activity `eventType: "assignment"`
  + notifikasi ke assignee baru (skip kalau unassign/nil atau assign ke diri
  sendiri).
- MCP tool baru `testify.issue.assign` (`write_tools.go`) — pola sama seperti
  `updateIssueStatus`.
- `BulkChangeStatus` **sengaja tidak diport** — belum ada tool MCP/REST yang
  butuh bulk, sesuai catatan asli di bawah (jangan bangun untuk kebutuhan
  hipotetis).

**Test:** `service/service_test.go` — `TestIssueService_UpdateStatus_NoopWhenUnchanged`
(activity/notifikasi tidak terpicu kalau status sama), 
`TestIssueService_UpdateStatus_NotifiesPreviousAssignee` (notifikasi terkirim,
tidak ada self-notify), `TestIssueService_Assign_LogsActivityAndNotifiesNewAssignee`
(activity + notifikasi ke assignee baru, tidak notify saat unassign). Detail
asli di bawah ini dipertahankan sebagai referensi desain.

**Kenapa ini fase terpisah dari G1/G2:** G1/G2 menyediakan primitif (tulis activity,
tulis notifikasi). G3 merangkainya persis seperti frontend, termasuk keputusan
"kapan tidak menulis apa-apa" (idempotency check).

**Yang perlu diubah:**
- `IssueService.UpdateStatus` — ubah signature jadi menerima `actor` (`ActorID`,
  opsional `ActorName`). Alur meniru `issueService.changeStatus`
  (`frontend/src/services/issueService.ts:189-216`):
  1. `Get` issue lama dulu (butuh status & assignee sebelumnya)
  2. `repo.UpdateStatus`
  3. **Hanya kalau status lama ≠ baru** → `activity.Record(...)` dengan
     `eventType: "status_change"`, `payload: {from, to}`
  4. Kalau `previous.AssignedTo` ada dan beda dari `actor.ActorID` →
     `notification.Create(...)`
- `IssueService.Assign` — method baru, belum ada di Go sama sekali. Port
  `issueService.assign` (`issueService.ts:218-239`) — activity `eventType:
  "assignment"` + notifikasi ke assignee baru.
- `IssueService.BulkChangeStatus` — opsional, port `bulkChangeStatus`
  (`issueService.ts:244-248`) **hanya jika** ada tool MCP/REST yang butuh bulk —
  jangan bangun untuk kebutuhan hipotetis (lihat aturan global CLAUDE.md: jangan
  desain untuk kebutuhan yang belum ada buktinya).
- `mcp-server/internal/tools/write_tools.go` — `updateIssueStatus` oper
  `session.Identity` sebagai `actor` (MCP session sudah tahu siapa pemilik token,
  tinggal diteruskan — lihat `write_tools.go:655-681`).

**Yang sengaja TIDAK diport di fase ini:**
- `issueService.update`/`patchField` — full field update, bukan status/assign. Beda
  scope, bisa jadi fase sendiri kalau MCP/REST butuh (saat ini MCP `testcase.update`
  sudah ada polanya, issue belum, tapi belum ada laporan gap di situ).

**Exit criteria:** test yang membuktikan (a) activity **tidak** tercatat kalau status
tidak berubah, (b) activity tercatat dengan payload `{from, to}` yang benar kalau
berubah, (c) notifikasi terkirim ke assignee lama saat status berubah dan ke assignee
baru saat `Assign` dipanggil, (d) MCP `testify.issue.updateStatus` end-to-end
menghasilkan row activity baru (test integrasi, bukan cuma unit mock).

---

## Fase G4 — Audit parity service lain (`done` — 2026-08-03)

**Hasil audit** (Module/Tag/TestRole/TestCase/TestPlan/TestRun Go vs
pasangan frontend-nya):

- **Module/TestRole** — satu-satunya rule ("name cannot be empty") adalah
  validasi form UI, sudah tercakup lewat `mcp.Required()`/validasi manual di
  `write_tools.go` (pola T3.2). **Sengaja tidak diport** — bukan business
  rule domain.
- **TestCase.Archive** — gap nyata: frontend log `status_change` activity
  saat archive/reactivate, Go `Archive` sebelumnya pure passthrough tanpa
  activity, dan `Reactivate` belum ada portnya sama sekali di Go. **Diport**:
  `core.TestCaseRepository.Reactivate` (port+repo), `TestCaseService.Archive`/
  `Reactivate` sekarang menerima `actorID`/`projectID`, log activity
  `status_change`, no-op kalau status sudah sama (idempotency check, pola
  sama seperti `IssueService.UpdateStatus`).
- **TestPlan** — gap nyata: tidak ada method setara `testPlanService.changeStatus`
  (activity log saat status berubah) — Go hanya punya `Approve` (repo-level,
  tanpa activity). **Diport**: `core.TestPlanRepository.ChangeStatus` (port+repo)
  + `TestPlanService.ChangeStatus` (get→no-op-if-same→update→log activity).
  `Approve` tetap terpisah (human-gate, tidak berubah).
- **TestRun.Complete** — gap nyata: frontend log `status_change` activity
  saat complete, Go `Complete` sebelumnya pure passthrough. `Reopen` belum
  ada portnya di Go. **Diport**: `core.TestRunRepository.Reopen` (port+repo)
  + `TestRunService.Complete`/`Reopen` sekarang menerima `actorID`/`projectID`,
  log activity, idempotency check.
- **Tag** (`saveTagsForTestCase`/`saveTagsForIssue` find-or-create + replace
  junction), **TestCase.cloneToProject**, **TestPlan.duplicate** —
  **sengaja tidak diport**: tidak ada tool MCP/REST yang butuh alur ini
  sekarang (MCP write tools tidak expose tag assignment atau cross-project
  cloning). Revisit kalau ada tool baru yang butuh.

**MCP tools baru** (`write_tools.go`): `testify.testplan.changeStatus`,
`testify.testrun.reopen` — pola sama seperti `updateIssueStatus`/`completeTestRun`
(get → scope guard → service call dengan actor). `testify.testcase.archive`
yang sudah ada otomatis dapat activity logging tanpa perubahan tool
signature (hanya service call di baliknya yang berubah).

**Test:** `service/service_test.go` —
`TestTestCaseServiceArchive_NoopWhenAlreadyArchived`,
`TestTestPlanService_ChangeStatus_LogsActivityOnlyWhenChanged`,
`TestTestRunService_Reopen_LogsActivityOnlyWhenChanged` (plus existing
Archive/Complete tests updated for the new actor-aware signatures).

**Kenapa perlu audit, bukan langsung port:** belum tentu semua service frontend
(`testCaseService.ts`, `testPlanService.ts`, `testRunService.ts`, `projectService.ts`,
dst) punya business rule tambahan di luar CRUD. `TestRunService`/`IssueService` Go
sudah dapat `Inspect`/`CanClose`/`GetWithDetail` (Fase 5.5) yang justru **lebih kaya**
dari frontend (dirancang khusus untuk agent). Audit ini untuk menemukan gap yang
arahnya sebaliknya — frontend involves rule yang Go belum punya.

**Cara kerja:** untuk tiap service Go (`TestCaseService`, `TestPlanService`,
`TestRunService`, `ModuleService`, `TagService`, `TestRoleService`), bandingkan method
per method dengan pasangan frontend-nya. Tandai gap sebagai salah satu dari:
- **Port sekarang** — rule sederhana, langsung dikerjakan di fase ini
- **Fase terpisah** — rule besar (mis. `projectDuplicateService.ts` yang sequential
  clone lintas entity) yang pantas jadi roadmap item sendiri
- **Sengaja tidak diport** — rule itu murni UI concern (mis. validasi form real-time)
  yang tidak relevan buat MCP/REST

**Exit criteria:** dokumen hasil audit (bisa jadi bagian dari fase ini sendiri di
`ROADMAP_V3.md`, diupdate dengan temuan) + PR untuk gap kategori "port sekarang".

---

## Fase G5 — `ActivityService.addComment` (`todo`, opsional sampai ada bukti kebutuhan)

**Kenapa ditunda:** belum ada tool MCP/REST yang butuh menulis comment (beda dari
system event). `addComment` juga bawa kompleksitas tambahan (`@mention` parsing +
resolve username → profile + notifikasi ke yang di-mention) yang tidak dibutuhkan
untuk menyelesaikan laporan awal (`issue.updateStatus` tidak tercatat).

**Trigger untuk mulai fase ini:** ada tool baru (`testify.issue.comment` — sempat
disebut sebagai item yang di-defer di `backend/TASKS.md` T4.1) yang butuh comment
sungguhan, bukan cuma activity log system event.

**Referensi:** `frontend/src/services/activityService.ts:24-65` (`addComment`).

---

## Fase R1 — REST API: endpoint Issue (`todo`)

**Depends on:** G3 (service harus full-parity dulu, supaya REST tidak mewarisi gap
yang sama seperti MCP sebelumnya).

**Pola:** ikuti `rest-api/internal/handler/project_handler.go` yang sudah ada (baca
dulu strukturnya saat eksekusi) — REST handler **memanggil service Go yang sama**
dipakai MCP (`service.IssueService`), bukan menulis ulang logic apa pun. Ini poin
utama yang memastikan "tidak menulis fungsionalitas 2x di tempat berbeda".

**Endpoint minimal:**
- `GET /api/v1/projects/{id}/issues` (list, filter setara `testify.issue.search`)
- `GET /api/v1/issues/{id}` (get, bisa terima `?detail=inspect` untuk full aggregate
  setara `testify.issue.inspect` — **satu handler, satu service call**, bukan dua
  endpoint terpisah kalau bedanya cuma kedalaman response)
- `POST /api/v1/issues` (create)
- `PATCH /api/v1/issues/{id}/status` (update status — otomatis dapat activity +
  notifikasi dari G3, tanpa REST tahu detail itu)
- `PATCH /api/v1/issues/{id}/assign`

**Auth di endpoint ini:** REST dipakai frontend (user login), beda dari MCP (API
token per-project) — lihat Fase R3.

**Exit criteria:** endpoint teruji (`rest-api/internal/handler/*_test.go` pola yang
sama dengan `health_handler_test.go`), Postman/curl manual: update status lewat REST
menghasilkan row activity yang sama persis strukturnya dengan yang dihasilkan MCP.

---

## Fase R2 — REST API: endpoint domain lain (`todo`)

**Depends on:** G4 (audit selesai, supaya tahu service mana yang sudah aman diekspos)
dan R1 (pola handler sudah settle).

Endpoint test case/test plan/test run/module/tag/test role, mengikuti pola yang sama
dengan R1. Urutan pengerjaan ikuti prioritas golden path testing domain (lihat
CLAUDE.md §Domain Model): TestCase → TestPlan → TestRun → TestResult, karena itu alur
yang paling sering dipakai user harian.

---

## Fase R3 — REST API: auth transport (`todo`)

**Kenapa terpisah dari R1/R2:** MCP pakai API token per-project (`TM_API_TOKEN`,
lihat `mcp-server/internal/auth/session.go`). Frontend butuh sesi user asli — Google
OAuth via Supabase Auth (lihat CLAUDE.md §Auth & RBAC). REST API perlu jalur auth baru
yang **memvalidasi token Supabase Auth** (JWT dari `supabase.auth`), bukan API token
statis, lalu resolve ke `users`/`profiles` + `project_members` role — supaya RBAC yang
sekarang hidup di Postgres RLS (`has_project_access`, `can_edit_project_content`) juga
ditegakkan di REST layer Go (RLS tidak otomatis berlaku kalau Go connect pakai service
role, harus di-replikasi eksplisit di service Go atau tetap connect pakai role
ter-scope — **keputusan arsitektur penting, perlu didiskusikan terpisah sebelum
implementasi**).

**Exit criteria:** ini fase paling berisiko keamanan di seluruh roadmap — exit
criteria minimal termasuk security review eksplisit sebelum dianggap selesai, bukan
cuma `go test` hijau.

---

## Fase F1 — Frontend: repository REST di belakang flag (`todo`)

**Depends on:** R1, R2, R3 semua harus `done` untuk domain yang mau dipindah.

**Pendekatan:** buat implementasi baru tiap `*Repository.ts` yang memanggil REST
(`fetch`/axios ke `rest-api`), **paralel** dengan implementasi Supabase yang sudah
ada — bukan mengganti file yang sama. Pilih salah satu lewat env var
(`VITE_DATA_BACKEND=supabase|rest`) di `frontend/src/config/`. Ini supaya rollback
instan kalau ada masalah, dan supaya F2 (migrasi modul Issue) bisa diuji tanpa
mempengaruhi modul lain yang masih di Supabase.

**Exit criteria:** `npm run build` bersih untuk kedua mode, tidak ada modul yang
benar-benar pindah di fase ini — cuma infrastruktur switching-nya siap.

---

## Fase F2 — Frontend: migrasi modul Issue (percobaan) (`todo`)

**Kenapa Issue duluan:** ini modul yang jadi trigger seluruh roadmap V3 (laporan
MCP awal), dan sudah paling lengkap ditutup dari sisi Go (G3 + R1). Jadi paling siap
dijadikan percobaan end-to-end.

**Yang harus diuji manual (bukan cuma automated test) sebelum dianggap selesai:**
Issue List page, Issue Detail page (comment/activity timeline — kalau G5 juga
selesai), Issue Editor (create/update), status change dari UI, assign dari UI —
bandingkan behavior sebelum/sesudah switch (activity log, notifikasi) benar-benar
identik.

**Exit criteria:** `VITE_DATA_BACKEND=rest` untuk Issue module dipakai di staging
selama periode uji (durasi ditentukan saat eksekusi), tidak ada regresi dilaporkan.

---

## Fase F3 — Frontend: migrasi modul sisanya (`todo`)

Satu per satu, mengikuti urutan R2 (TestCase → TestPlan → TestRun → TestResult),
lalu Project/Membership/Notification (paling terakhir karena paling menyentuh
auth — depends on R3 matang).

---

## Fase F4 — Hapus jalur Supabase langsung dari frontend (`todo`)

**Definisi selesai:** `@supabase/supabase-js` di frontend cuma dipakai untuk
`supabase.auth.*` (Google OAuth login/session) — nol pemanggilan `.from(...)` /
`.rpc(...)` untuk data domain. Semua `repositories/*.ts` lama (jalur Supabase)
dihapus, bukan dibiarkan sebagai dead code.

**Ini adalah titik di mana `backend/README.md` "PENDING/paused" tidak lagi akurat**
— update CLAUDE.md project root + `backend/README.md` sebagai bagian dari exit
criteria fase ini, supaya dokumentasi tidak basi (pelajaran dari kondisi sekarang: doc
bilang backend paused padahal MCP sudah dipakai aktif oleh AI agent).

---

## Yang sengaja di luar scope roadmap ini

- **SSR/Next.js migration** — tidak relevan, keputusan SPA murni tetap berlaku
  (CLAUDE.md §Kenapa tidak ada Controller/API layer, alasan itu masih valid setelah
  REST API ada — REST bukan alasan untuk SSR).
- **Ganti Postgres/Supabase ke storage lain** — di luar cakupan, roadmap ini soal
  siapa yang bicara ke database (Go service vs frontend langsung), bukan storage-nya.
- **Real-time (Supabase Realtime subscriptions)** — kalau frontend saat ini pakai
  polling (lihat CLAUDE.md §Notifications: 30 detik polling, bukan realtime), REST
  API tidak perlu menyediakan WebSocket/SSE di V3 ini. Kalau ada kebutuhan realtime
  di masa depan, itu roadmap terpisah.

---

## Urutan dependency ringkas

```
G1 (activity write) ─┬─→ G3 (IssueService parity) ─→ R1 (REST Issue) ─┬─→ F1 (flag infra)
G2 (notification)   ─┘                                                 │
                                                                        ├─→ F2 (migrasi Issue)
G4 (audit lain) ──→ R2 (REST domain lain) ──────────────────────────────┼─→ F3 (migrasi sisanya)
                                                                        │
R3 (auth transport) ────────────────────────────────────────────────────┴─→ F4 (hapus Supabase)

G5 (comment/mention) — independen, mulai kapan saja ada trigger nyata
```
