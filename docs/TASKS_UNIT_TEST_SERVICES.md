# Work Breakdown — Unit Test Service Layer (`frontend/src/services/`)

Daftar kerja untuk melengkapi unit test tiap file di `frontend/src/services/`,
dipecah per file supaya bisa didistribusikan sebagai ticket terpisah ke agent
lain. **Baca `docs/ARCHITECTURE.md` §7 (Testing) dulu sebelum mengerjakan
ticket manapun di sini** — itu berisi kontrak wajib: kenapa mock repository
(bukan SQLite), format file, dan apa yang sengaja tidak ditest.

Status per 2026-08-01: **18 dari 19 file sudah ditest** (17 file baru ditambahkan
di sesi ini — SVC-T01–T17 — plus `testCaseService.ts`/`testRunService.ts` yang
sudah ada sebelumnya). Satu-satunya yang tidak ditest: `auditLogService.ts`
(SVC-T18) — pass-through murni, sengaja di-skip. Coverage service layer setelah
sesi ini: ~73% statements / ~77% branch (`npm run test:coverage`).

---

## Aturan wajib untuk semua ticket (jangan diulang per-ticket, baca sekali)

1. **Lokasi & nama file**: co-located, bukan folder `__tests__/`. Test untuk
   `services/xService.ts` ditulis di `services/xService.test.ts` (sebelahan,
   nama sama + suffix `.test.ts`).
2. **Mock repository, bukan database asli/SQLite** — pakai `vi.mock('../repositories/xRepository', () => ({...}))`
   lalu `const { xRepository } = await import('../repositories/xRepository')`
   di atas file, sebelum `await import('./xService')`. Alasan lengkap di
   `docs/ARCHITECTURE.md` §7.3 — **jangan** coba pasang SQLite atau database
   nyata, itu keputusan yang sudah diambil sadar, bukan kelalaian.
3. **Mock juga service lain** yang di-import oleh service yang ditest (mis.
   `tagService` dipanggil dari dalam `testCaseService`) — pola sama seperti
   repository, lihat contoh di `testCaseService.test.ts`.
4. **`vi.clearAllMocks()`** di `beforeEach` supaya assertion antar test tidak
   bocor.
5. **Fokus ke business rule**, bukan sekadar "apakah repository dipanggil":
   - Validasi yang melempar `Error` (field kosong, dsb) — assert pesan error
     persis (`.rejects.toThrow('pesan exact')`), bukan cuma "throws".
   - Percabangan (mis. "hanya log activity kalau status berubah") — test
     KEDUA cabang (berubah vs tidak berubah), bukan cuma satu.
   - Kalkulasi/derivasi nilai (summary, dedup, mapping fallback) — assert
     hasil akhirnya, bukan cuma "tidak error".
   - Trimming/normalisasi input sebelum diteruskan ke repository — assert
     argumen yang diterima repository sudah ter-trim.
   - Urutan eksekusi kalau didokumentasikan sengaja (mis. komentar
     "sequential, bukan Promise.all") — verifikasi lewat urutan pemanggilan
     mock kalau relevan terhadap benar/salahnya perilaku (bukan cuma gaya).
6. **Jangan test yang bukan tanggung jawab file itu** — kalau logic ada di
   repository (query mentah) atau helper (`mappers.ts`), bukan tugas ticket
   ini untuk mentest itu.
7. Setelah selesai satu file, jalankan `npm test` dari folder `frontend/` dan
   pastikan semua test (lama + baru) hijau. Jangan ubah file service yang
   ditest kecuali menemukan bug nyata — kalau begitu, laporkan dulu, jangan
   diam-diam "perbaiki" behavior yang sedang ditest.

Referensi pola lengkap: `frontend/src/services/testCaseService.test.ts` dan
`frontend/src/services/testRunService.test.ts`.

---

## Ticket — Prioritas Tinggi (business logic padat, ROI test tertinggi)

| ID       | File                       | Baris | Fokus test (fungsi spesifik)                                                                                                                                                                                                                                                                                                | Status |
| -------- | -------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| SVC-T01  | `issueService.ts`          | 260   | `create`/`createMany`: title kosong ditolak, default `type ?? 'bug'`/`priority ?? 'medium'`, tag saving cuma jalan kalau `tagNames` diberikan, `linkToTestResult` cuma jalan kalau `testResultId` diberikan. `changeStatus`: activity log **hanya** kalau status benar-benar berubah (test kedua cabang), notifikasi **hanya** kalau ada assignee DAN assignee ≠ actor (test 3 kombinasi: tidak ada assignee, assignee = actor, assignee ≠ actor). `assign`: notifikasi hanya kalau assignee baru ≠ actor. `bulkChangeStatus`/`bulkAssign`: verifikasi loop sequential (bukan `Promise.all`) — assert tiap item diproses lewat method single-row yang sudah ditest sendiri | done   |
| SVC-T02  | `testSuiteService.ts`      | 465   | File terbesar — split jadi beberapa `describe` block dalam 1 file test: (1) `addItem`/`addItemsMany` — validasi `stepType` sama seperti `testCaseService.create` (`simple` butuh steps+expectedResult, `detailed` butuh `detailedSteps.length > 0`); (2) `duplicateSuite`/`cloneItemsToSuite`/`cloneItemsToProject`/`cloneProjectCasesToSuite` — resolusi module/role by name **case-insensitive** (`toLowerCase()`), find-or-create untuk nama yang belum ada, `orderIndex` melanjutkan dari `existingItems.length + i` bukan mulai dari 0 lagi, step grouping per source item via Map benar (step tidak tertukar antar item) | done   |
| SVC-T03  | `projectDuplicateService.ts` | 185 | `duplicateProject`: union `selectedTestCaseIds` — test case yang dipilih eksplisit + yang ikut karena test plan-nya dipilih (transitively), tidak ada duplikat di union. Module/tag/role name→id remapping (`moduleIdMap`/`testRoleIdMap`/`testCaseIdMap`) — nama yang sudah ada di project tujuan dipakai ulang, nama baru dibuat. Step insert **hanya** untuk item `stepType === 'detailed'`. Plan-case `order` index diturunkan dari posisi array. Attach input dengan `testCaseId` yang gagal resolve di-filter keluar (tidak error, tidak insert baris invalid) | done   |
| SVC-T04  | `testPlanService.ts`       | 121   | `changeStatus`: activity log **hanya** kalau `previous.status !== status` (test kedua cabang persis seperti `issueService.changeStatus`). `duplicate`: fetch source plan, create plan baru, loop `addCase` sequential dengan index urutan (`i`) terjaga — assert urutan pemanggilan bukan cuma jumlah pemanggilan. `bulkChangeStatus`: sequential loop, tiap item lewat `changeStatus` (jadi activity log per-item ikut aturan yang sama) | done   |
| SVC-T05  | `tagService.ts`            | 80    | `saveTagsForTestCase(Many)`/`saveTagsForIssue(Many)`: dedup nama tag via `Set` (nama duplikat di input jadi 1 baris junction), trim + filter nama kosong sebelum diproses, `findOrCreate`/`findOrCreateMany` — nama yang sudah ada dipakai ulang (tidak create ulang), nama baru dibuat. Early-return saat array tag kosong (tidak query kosong ke repository) | done   |
| SVC-T06  | `projectMemberService.ts`  | 82    | `invite`/`reinvite`: fetch project + profile inviter secara paralel, fallback nama (`?? 'Someone'`) kalau nama tidak ada, isi pesan notifikasi ter-compose benar dengan fallback itu. `remove`: urutan wajib — hapus notifikasi lama by reference dulu, baru hapus member, baru buat notifikasi baru "removed" (assert urutan pemanggilan mock, bukan cuma assert semuanya terpanggil) | done   |
| SVC-T07  | `activityService.ts`       | 87    | `extractMentionedUsernames`: regex parsing `@username` dari teks bebas, dedup via Set, tidak salah tangkap teks yang mirip tapi bukan mention. `addComment`: trim + tolak body kosong, resolve mention ke user asli (skip username yang tidak ketemu — tetap teks biasa, bukan error), **filter mention ke diri sendiri** (actor mention dirinya sendiri tidak memicu notifikasi ke diri sendiri), notifikasi dikirim paralel ke tiap mentioned user yang valid | done   |
| SVC-T08  | `testCaseImportService.ts` | 87    | `importRows`: resolusi nama module/role case-insensitive dengan batch-create untuk nama yang belum ada (assert tidak create duplikat untuk nama yang sudah resolve di baris sebelumnya dalam batch yang sama). Tag assignment index-aligned ke `rows[i]` — tag row ke-N harus menempel ke test case row ke-N, bukan tertukar. Detailed step insert **hanya** untuk row dengan `stepType === 'detailed'`, sequential per row | done   |

## Ticket — Prioritas Menengah (ada logic, tapi lebih sempit scope-nya)

| ID       | File                    | Baris | Fokus test                                                                                                                                                                                                                                                       | Status |
| -------- | ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| SVC-T09  | `projectService.ts`     | 83    | `list`/`listPaginated`: dedup owner id sebelum join profile, lalu mapping fallback — **catat bahwa kedua method ini punya fallback berbeda** (`?? null` vs `?? '—'`), tulis test yang membuktikan perbedaan itu memang disengaja (atau flag sebagai bug kalau ternyata tidak konsisten tanpa alasan — laporkan, jangan diam-diam samakan). `changeStatus`: activity log hanya kalau `actor` diberikan DAN status berubah (test kombinasi: tanpa actor, dengan actor tapi status sama, dengan actor dan status beda) | done   |
| SVC-T10  | `dashboardService.ts`   | 48    | `getRecentProjects`/`getContinueWorking`/`getMyWorkIssues`: pola dedup+join+fallback yang mirip tapi beda key path per method (`p.ownerId` vs `item.project.ownerId` vs `issue.projectOwnerId`) — test tiap method secara terpisah dengan shape data masing-masing, jangan asumsikan satu test mewakili ketiganya | done   |
| SVC-T11  | `profileService.ts`     | 35    | `updateOwnProfile`: aturan "username sekali seumur hidup" — test 3 skenario: username tidak diubah (boleh), username diubah pertama kali (boleh), username diubah lagi setelah pernah diubah (ditolak). Ini business rule penting yang juga dijaga trigger DB `check_username_change` — test di sini adalah lapisan validasi FE-nya | done   |
| SVC-T12  | `userService.ts`        | 57    | `listPaginated`: mapping row dengan fallback `?? '—'` untuk field profile yang kosong (nama, dsb) — assert fallback tampil saat data memang null/undefined, bukan menimpa data yang valid | done   |

## Ticket — Prioritas Rendah (pass-through, test tipis/opsional)

Service-service ini isinya mostly delegasi langsung ke repository tanpa
logic tambahan. **Tidak wajib ditest** — kalau dikerjakan, cukup 1 test
smoke per fungsi publik (assert fungsi memanggil repository yang benar
dengan argumen yang benar), bukan test skenario bercabang karena memang
tidak ada cabang untuk ditest. Kalau waktu terbatas, skip grup ini duluan.

| ID       | File                     | Baris | Catatan                                                                                          | Status |
| -------- | ------------------------ | ----- | -------------------------------------------------------------------------------------------------- | ------ |
| SVC-T13  | `moduleService.ts`       | 27    | `create`/`update`/`createMany` — hanya validasi nama kosong + trim, sisanya pass-through            | done   |
| SVC-T14  | `testRoleService.ts`     | 26    | Sama persis bentuknya dengan `moduleService` (nama kosong + trim)                                   | done   |
| SVC-T15  | `notificationService.ts` | 31    | `create` bungkus 1 RPC call, lempar error kalau gagal — trivial                                     | done   |
| SVC-T16  | `attachmentService.ts`   | 54    | `upload`/`remove` orkestrasi storage+repo tanpa branching — trivial                                 | done   |
| SVC-T17  | `testCaseStepService.ts` | 14    | `replaceForTestCase` trim+filter step kosong sebelum delegasi — 1 test cukup                        | done   |
| SVC-T18  | `auditLogService.ts`     | 7     | Pass-through murni — skip, tidak perlu ticket sendiri                                               | skip   |

---

## Urutan pengerjaan yang disarankan

1. Kerjakan grup **Prioritas Tinggi** dulu (SVC-T01–T08) — ini yang paling
   mungkin menangkap regresi nyata karena business logic-nya padat.
2. **`testSuiteService.ts` (SVC-T02)** adalah file terbesar (465 baris) —
   kalau didistribusikan ke agent lain, pertimbangkan pecah jadi 2 ticket
   terpisah (create/validate vs duplicate/clone) supaya satu agent tidak
   kewalahan menahan konteks 1 file besar.
3. Grup **Prioritas Menengah** (SVC-T09–T12) berikutnya.
4. Grup **Prioritas Rendah** opsional — boleh dilewati kalau waktu terbatas,
   tidak mengurangi nilai coverage yang berarti.
5. Setelah semua Prioritas Tinggi + Menengah selesai, jalankan `npm run
   test:coverage` dari `frontend/` dan cek `frontend/coverage/index.html` —
   bandingkan dengan baseline sebelum kerjaan ini (lihat
   `docs/ARCHITECTURE.md` §7.2 untuk cara baca laporannya).

## Di luar scope dokumen ini

- Repository test (butuh adapter/port pattern dulu — lihat
  `docs/ARCHITECTURE.md` §1.2/§7.5 dan item backlog "Repository adapter/port
  pattern" di `TODO.md`)
- Hook test, Component test, E2E test (§7.5)
- Menambah `coverage.thresholds` yang menggagalkan CI (belum ada CI yang
  menjalankan test sama sekali)
