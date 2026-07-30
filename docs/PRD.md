# PRD — Testify (shiftech-test-mgr)

**Companion to:** [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) (technical view,
Testing Domain). Dokumen ini adalah **product/business** view untuk Testing
Domain (§3 di bawah — Project → Module → Test Case → Test Plan → Test Run →
Test Result → Issue), yang tidak berubah oleh Platform Evolution V2.

> **Governed by [`docs/PRODUCT_CONSTITUTION.md`](PRODUCT_CONSTITUTION.md)**
> (visi produk, scope MVP, aturan penerimaan fitur — dokumen tertinggi kalau
> ada konflik). Untuk Platform Context (auth, project ownership/visibility,
> membership invite/accept, identity publik) yang jadi fokus evolusi produk
> saat ini, lihat [`docs/ARCHITECTURE_V2.md`](ARCHITECTURE_V2.md) dan
> [`docs/ROADMAP_V2.md`](ROADMAP_V2.md) — §4.7/§4.8 di bawah ini
> mendeskripsikan model **sebelum** V2 (approval-gated signup), disimpan
> sebagai konteks historis.

## 1. Latar Belakang & Tujuan

Aplikasi internal untuk membantu proses **manual software testing** pada
proyek-proyek internal (Amanah POS, ERP SPBU, ERP Pesantren, WiFi Billing, dll).
Fokus versi pertama: menggantikan checklist Excel dengan sistem terstruktur yang
sederhana, cukup untuk tim kecil maupun anak PKL.

Sekaligus jadi **eksperimen arsitektur**: memvalidasi pola clean layering
(Repository/Service/Hook/Component) di React SPA dengan Supabase sebagai
storage, dan PrimeReact sebagai UI library. Rencana jangka menengah: storage
dipindah ke SQLite + backend PHP terpisah — karena itu layer Repository sengaja
dijaga sebagai satu-satunya titik yang bicara ke Supabase.

**Kolaboratif secara real-time**: karena beberapa tester bisa mengerjakan Test
Run yang sama secara bersamaan, perubahan data (hasil test, status run, issue
baru, dst) langsung tersinkronisasi ke semua browser yang sedang membuka
halaman terkait tanpa perlu refresh manual — lihat
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md) §2.6 untuk detail teknis (React
Query + Supabase Realtime).

## 2. Target Pengguna

- Tim internal (QA/dev) yang mencatat dan melacak eksekusi test case per
  rilis/project, termasuk anggota tim junior (PKL) yang butuh alur kerja yang
  jelas dan sederhana.

## 3. Konsep Test Management

Alur kerja mengikuti proses QA umum, memisahkan **template pengujian** dari
**riwayat eksekusi** — ini keputusan sentral yang membedakan versi ini dari
versi awal (yang sempat menyimpan hasil pass/fail langsung di baris Test
Plan–Test Case dan tertimpa setiap kali dites ulang):

```
Project → Module → Test Case (template)
Project → Test Plan → Test Run → Test Result → Issue (jika FAIL)
```

### Project

Aplikasi yang sedang diuji (mis. Amanah POS, ERP SPBU). Semua data testing
berada di dalam satu Project.

### Module

Pengelompokan fitur dalam Project (Authentication, Dashboard, Master Barang,
dll) — master per project, dikelola dari tab "Modules" di halaman detail
project. Satu Test Case hanya berada di satu Module. Tujuannya supaya Test Case
mudah dicari/dikelompokkan, bukan bercampur jadi satu daftar panjang.

### Tag

Label tambahan lintas Test Case (Regression, Smoke, Critical, Mobile, API, UI) —
many-to-many, beda fungsi dari Module: Module adalah kategori utama (wajib, satu
per case), Tag hanya label pencarian tambahan (opsional, bisa banyak). Dropdown
tag bersifat _creatable_ — ketik nama baru, otomatis jadi tag baru di project
itu.

### Test Plan

Rencana pengujian (Smoke Test, Regression Test, Release 1.2) — menentukan
**kumpulan Test Case** yang akan dijalankan pada suatu sesi pengujian. Test Plan
sendiri tidak menyimpan hasil.

**Sequence (urutan eksekusi)** — Test Case dalam sebuah Test Plan bisa
diurutkan lewat drag & drop (kolom `order`), mendukung pengujian yang punya
alur/workflow (mis. Login → Master Barang → Pembelian → Penjualan). Test Run
baru **mewarisi** urutan plan pada saat run dimulai (snapshot, tidak berubah
retroaktif kalau plan di-reorder setelahnya). **Sequence bersifat panduan
workflow, bukan pembatas eksekusi** — tester tetap boleh mencatat hasil test
case manapun tidak sesuai urutan (kadang cuma mau uji satu modul, atau bug
sudah diketahui sehingga langkah sebelumnya tak perlu diulang). Sengaja tidak
dibuat entity "Test Suite" terpisah — urutan cukup jadi atribut baris relasi
Test Plan ↔ Test Case.

### Test Case

Template/definisi pengujian: Module, Title, Objective (opsional), Precondition,
Steps, Expected Result, Priority, Status (`active`/`archived`), Notes, Tags.
**Test Case bersifat tetap dan tidak pernah menyimpan hasil PASS/FAIL** — ia
dipakai berulang kali lintas Test Plan dan lintas Test Run.

Test Case punya `step_type`, dua mode:

- **`simple`** (default, seperti sekarang) — Steps & Expected Result tetap teks
  bebas satu blok, tanpa entitas terpisah.
- **`detailed`** — Steps dipecah jadi baris-baris **Test Case Step**
  ternormalisasi (nomor urut, aksi, expected result per-step). Saat Test Run
  dieksekusi, tiap Test Case Step mendapat baris **hasil per-step** sendiri
  (pass/fail sederhana + actual result), terikat ke Test Result induk — supaya
  detail step mana yang gagal tetap tercatat, bukan cuma status keseluruhan
  Test Case.

Mode ini dipilih per Test Case (bukan per project) — test case sederhana boleh
tetap simple, hanya test case yang butuh presisi step-by-step yang perlu
detailed. Tidak mengubah konsep inti: Test Case tetap template, hasil (baik
level Test Result maupun level step) tetap hidup di riwayat eksekusi.

### Test Run

Pelaksanaan pengujian terhadap sebuah Test Plan pada satu waktu tertentu (mis.
"Regression Test — 25 Juli 2026"). **Setiap kali Test Plan yang sama dites
ulang, dibuat Test Run baru** — bukan menimpa run sebelumnya. Dengan begitu
riwayat setiap rilis tetap tersimpan dan bisa dibandingkan.

- Status Test Run: `in_progress` / `completed` — **selalu diubah manual** oleh
  tester/admin lewat tombol, tidak pernah disimpulkan otomatis dari semua hasil
  terisi.
- **Ringkasan progress** (jumlah pass/fail/skip/blocked, persentase eksekusi)
  selalu **dihitung otomatis** dari Test Result yang ada — ini bukan kolom
  tersimpan, jadi selalu akurat dan real-time.
- **Test Run tidak wajib berasal dari Test Plan (Unplanned/Custom Run).**
  Kadang tester perlu menguji sesuatu dadakan (mis. verifikasi cepat hotfix)
  tanpa mau membuat Test Plan formal dulu. Tombol "Buat Test Run" di tab Test
  Runs (Project Detail) membuka dialog dengan dua mode: **"Dari Test Plan"**
  (alur normal — pilih plan, cakupan Test Case ikut plan tsb) atau
  **"Unplanned / Custom"** — tanpa Test Plan sama sekali, tester memilih Test
  Case satu per satu langsung dari daftar Test Case project. Test Run jenis
  ini tetap terikat ke Project (untuk kode entity, RLS, dan riwayat), hanya
  saja tidak punya Test Plan induk.

### Test Result

Hasil eksekusi satu Test Case pada satu Test Run: status
(`pass`/`fail`/`skip`/`blocked`/`not_run`), **Tester** (wajib user terdaftar di
aplikasi, dipilih dari dropdown — bukan nama bebas, supaya riwayat testing
selalu bisa ditelusuri ke akun yang jelas), tanggal eksekusi, catatan.
**PASS/FAIL bukan milik Test Case, melainkan milik Test Result** — begitu Test
Run baru dimulai, setiap Test Case dalam cakupannya otomatis mendapat baris Test
Result baru berstatus `not_run`.

### Issue (Issue & Feature Tracking)

**Perubahan besar dari v1:** Issue sekarang adalah entity **level Project**,
berdiri sendiri — tidak lagi wajib lahir dari satu Test Result tertentu.

- **Relasi wajib**: `Project`. Setiap Issue harus terikat ke satu project.
- **Relasi opsional**: `Module` (nullable — issue boleh general, tidak terikat
  module tertentu), `Tag` (many-to-many, reuse master Tag yang sama dengan Test
  Case — bukan tag terpisah).
- **Relasi ke Test Result: N ke M** (bukan lagi 1:many searah). Satu Issue bisa
  terkait ke banyak baris Test Result (mis. kegagalan yang sama muncul lagi di
  run berikutnya, tim mau link ke keduanya biar riwayatnya nyambung), dan satu
  Test Result boleh terkait ke banyak Issue (satu kegagalan bisa melahirkan
  beberapa temuan terpisah). Ini **link**, bukan "membuat issue baru" — di
  Test Run, aksi user adalah **menautkan** Test Result ke Issue yang sudah ada
  atau membuat Issue baru lewat dialog tanpa pindah halaman (lihat §4.6).
- **Type**: `bug` | `feature` | `improvement` | `task` — daftar tetap
  (enum/check constraint), supaya modul ini sekaligus bisa jadi pelacak
  feature request sederhana, bukan cuma bug dari hasil test.
- **Field lain**: title, description, actual result, expected result, priority,
  status (`backlog`/`open`/`in_progress`/`resolved`/`verified`/`closed`/
  `rejected`/`duplicate` — diperluas 2026-07-30 dari 5 jadi 8 nilai, lihat
  `docs/ROADMAP_V2.md` catatan Phase 8 lanjutan), assigned to (user terdaftar).
- **External links**: array link eksternal (`{url, label?}`) — sekadar tautan
  yang bisa diklik ke resource terkait (issue tracker, PR, dokumen, dll),
  bukan integrasi API dua arah (lihat §Out of Scope). Satu Issue bisa punya
  beberapa link.
- Attachment/screenshot: lihat §Attachment di bawah — tidak lagi out of scope,
  tapi lewat storage adapter, bukan langsung Supabase Storage hardcoded.

### Attachment (Issue)

Upload file → dapat URL → simpan URL di database. Disimpan lewat **storage
adapter** (interface), bukan panggilan langsung ke satu provider — supaya bisa
ganti provider kapan saja tanpa mengubah service/UI:

- Adapter awal: **Supabase Storage** (gratis, sudah dipakai untuk DB & auth,
  tanpa dependency baru).
- Disiapkan juga slot untuk **backend upload internal** (server milik sendiri)
  sebagai adapter alternatif di masa depan — bisa switch tanpa mengubah kode
  pemanggil, cukup ganti adapter yang aktif.
- Satu Issue bisa punya banyak attachment (0..N).

### Kode Entity (Module, Test Case, Test Plan, Test Run)

Setiap Module, Test Case, Test Plan, dan Test Run punya kode singkat
(`MOD-0001`, `TC-0001`, `TP-0001`, `TR-0001`) — nomor urut per project per jenis
entity. **Default otomatis** (dibuat oleh database saat entity disimpan tanpa
kode), **tapi selalu bisa diedit** oleh user lewat field Kode di form
masing-masing (mis. diganti jadi `TC-LOGIN-01` kalau tim punya konvensi
sendiri). Tujuannya supaya entity mudah dirujuk secara singkat dalam
percakapan/dokumen (mirip penomoran issue di Jira/GitHub), tanpa memaksa satu
skema penomoran kaku.

## 4. Scope — Modul

### 4.1 Projects

- CRUD project (nama, deskripsi)
- Project adalah container utama — semua module, test plan & test case terikat
  ke satu project
- **Status lifecycle**: `active` (default) → `inactive` → `archived`, diubah
  lewat menu aksi per baris (bukan field form biasa)
- **List**: searchable (nama), filter by status, sortable (nama/tanggal
  dibuat/tanggal update)
- **Detail page** (`/projects/:id`): info lengkap project + tab **Test Plans**,
  **Test Cases**, **Modules**, **Tags** + tombol Hapus Permanen
- **Hapus Permanen**: berbeda dari soft-delete — ini benar-benar `DELETE` dari
  database (project + seluruh module/test plan/test case/test run/test
  result/issue ikut terhapus via `on delete cascade`), diproteksi dialog
  konfirmasi tegas. Sengaja dibuat permanen (bukan soft-delete seperti pola
  amanah-pos) karena diminta eksplisit — tidak ada fitur restore

### 4.2 Modules & Tags

- **Module**: CRUD per project (kode + nama) — dikelola dari tab "Modules" di
  halaman detail project. Test Case memilih satu Module dari dropdown (nullable
  — boleh tanpa module)
- **Tag**: tab "Tags" di halaman detail project — lihat semua tag yang pernah
  dipakai, rename, atau hapus (tag baru sendiri dibuat on-the-fly dari form Test
  Case, bukan dari tab ini — lihat §Konsep Test Management)

### 4.3 Test Cases

- CRUD test case: Module (dropdown), Title, Objective (opsional), Preconditions,
  Steps, Expected Result, Priority, Notes, Tags (dropdown creatable)
- Priority: `low | medium | high | critical`
- Status: `active | archived` (arsip = tidak muncul lagi di pemilihan test plan
  baru, tapi riwayat hasil lama tetap ada)
- Test case bersifat reusable — bisa dipakai di banyak test plan berbeda, dan
  **tidak pernah menyimpan hasil PASS/FAIL sendiri**
- **Role Target (RBAC testing, E17)** — dropdown ke master **Test Role**
  per project (awalnya teks bebas, sejak E17 lanjutan jadi master list mirip
  Module, supaya konsisten & bisa direname tanpa mengubah tiap row) untuk
  menguji test case yang sama secara konsep tapi perlu diverifikasi ulang
  per role aplikasi yang ditest (mis. "Admin", "Manager", "Member"). Bukan
  sistem varian otomatis — kalau steps/expected result berbeda per role,
  user membuat test case terpisah secara manual dan sekadar memilih Test
  Role yang sesuai
- **Import dari Excel/CSV (E17)** — impor banyak test case sekaligus dari
  file CSV (kolom: Module, Title, Objective, Preconditions, Steps, Expected
  Result, Priority, Tags, Target Role — hanya Title wajib). Preview baris
  valid vs invalid sebelum commit. Hanya mendukung test case `simple`
  (bukan `detailed`) untuk versi awal ini

### 4.3.1 Test Suite Library (E17, semula "Test Case Template Library")

Library test case global (bukan per-project), untuk inisialisasi cepat
project baru tanpa mengetik ulang test case standar dari nol. Menu UI-nya
bernama **"Test Suite"** (di-rename dari "Test Case Templates" supaya tidak
rancu dengan "Test Case" biasa) — kode dan skema tabel mengikuti nama ini
(lihat `docs/ARCHITECTURE.md` §6.7).

- Dikelola **admin** (create/edit/delete suite dan isinya), tapi bisa
  **dilihat dan di-clone oleh semua user approved** — bukan fitur admin-only
  sepenuhnya, karena tujuannya adalah dipakai lintas project oleh siapa saja
- Satu Suite berisi banyak Item (setara Test Case: Module, Title,
  Objective, Steps, Expected Result, Priority, Tags, Role Target, mendukung
  mode `simple`/`detailed` sama seperti Test Case biasa)
- **Clone ke project**: saat membuat Project Baru, ada opsi "Mulai dari
  Template" (opsional) yang otomatis clone semua item suite itu jadi Test
  Case nyata di project baru. Bisa juga dilakukan kapan saja setelah project
  ada, lewat tombol "Import dari Template" di tab Test Cases — dan boleh
  pilih sebagian item saja, tidak wajib semua
- Module/Tag di suite disimpan sebagai teks bebas (bukan terikat project
  manapun) — saat di-clone, dicocokkan ke Module/Tag yang sudah ada di
  project tujuan atau dibuat baru otomatis kalau belum ada

### 4.4 Test Plans

- CRUD test plan per project
- Status: `draft | active | completed | archived`
- Tambah/keluarkan test case ke/dari cakupan plan (many-to-many via
  `test_plan_cases` — HANYA daftar cakupan, tanpa kolom hasil)
- **Sequence (urutan eksekusi)**: `test_plan_cases.order` menentukan urutan
  tampil test case di dalam plan — drag & drop di tabel Test Cases untuk
  mengubah urutan (aktif hanya saat tidak ada filter/search, supaya reorder
  selalu terhadap daftar penuh). **Sequence bersifat panduan workflow, bukan
  pembatas eksekusi** — tester tetap boleh mencatat hasil test case tidak
  sesuai urutan (kadang cuma mau tes satu modul, atau bug sudah diketahui
  sehingga langkah sebelumnya tak perlu diulang). Sengaja tidak dibuat entity
  "Test Suite" terpisah — urutan cukup jadi atribut baris `test_plan_cases`
- Tab "Test Runs": mulai run baru (menyalin cakupan test case **beserta
  urutannya saat itu** ke Test Result baru berstatus `not_run` — Test Run
  mewarisi sequence plan pada saat run dibuat, tidak berubah retroaktif kalau
  plan di-reorder setelah run berjalan), lihat riwayat semua run sebelumnya

### 4.5 Test Runs & Test Results

- Halaman **Test Runs** lintas project (`/test-runs`, ada di sidebar) — pilih
  project via dropdown, lihat semua run dari semua Test Plan dalam project itu
  sekaligus (kode, nama, Test Plan asal, status, tanggal)
- Detail satu Test Run (`/test-runs/:id`): ringkasan otomatis
  (pass/fail/skip/blocked/belum dites, persentase progress), tabel semua Test
  Case dalam run dengan aksi "Catat" hasil (status, tester dari dropdown user
  terdaftar, catatan)
- Tombol "Selesaikan Run" (manual) / "Buka Kembali" — mengubah
  `test_runs.status`, tidak memengaruhi kemampuan mencatat hasil (run yang sudah
  selesai tetap bisa dibuka lagi)

### 4.6 Issues (Issue & Feature Tracking)

- **Halaman Issue per Project** (baru, standalone) — list semua issue milik
  project (bukan cuma yang lahir dari test run), filter by type/status/
  priority/module/tag, ubah status & assignee inline
- CRUD issue langsung dari halaman ini: title, description, type
  (bug/feature/improvement/task), priority, status, module (opsional), tag
  (opsional, banyak), assigned to, external links (banyak)
- **Dari Test Run**: di baris Test Result, aksi "Link Issue" membuka dialog
  berisi (a) daftar issue project yang sudah ada untuk dipilih/ditautkan
  (N ke M — satu result boleh tertaut banyak issue, satu issue boleh tertaut
  banyak result), dan (b) opsi "Buat Issue Baru" di dalam dialog yang sama
  (tanpa pindah halaman) — hasil create langsung ikut ditautkan ke Test Result
  tsb
- Halaman lama `/test-runs/:id/issues` tetap ada tapi jadi **view issue yang
  ditautkan ke run tsb** (join lewat junction), bukan pemilik data
- Attachment per issue — lihat §Attachment di §3

### 4.7 User Management & Akses (RBAC)

> **Bagian ini sudah superseded oleh Platform Evolution V2** (Phase 1/2/4,
> semua `done` — lihat `docs/ARCHITECTURE_V2.md`, `docs/ROADMAP_V2.md`).
> Ringkasan model saat ini:
> - Signup **self-serve** — TIDAK ADA lagi status `pending`/approval admin.
>   User baru langsung bisa pakai aplikasi begitu login Google pertama kali
> - Identity di-split: `users` (privat — email, role) + `profiles` (publik —
>   username, display name, avatar, bio)
> - Akses ke project sekarang lewat **invite/accept**, bukan direct-add oleh
>   admin — lihat §4.7.1 di bawah
>
> Poin-poin di bawah ini (alur `pending`/approval) dipertahankan sebagai
> konteks historis kenapa modelnya dulu begitu.

- **Login**: hanya via **Google OAuth** (Supabase Auth) — tidak ada login
  email/password
- **Role global** (`profiles.role`, versi lama): `pending` (default saat baru daftar) →
  `user` (disetujui admin) → `admin` (hak penuh, akses semua project)
- **Alur onboarding (lama)**: user baru sign-in dengan akun Google mana pun → masuk
  sebagai `pending` → diarahkan ke halaman "Menunggu Persetujuan" → tidak bisa
  akses modul apa pun sampai seorang **admin** meng-approve lewat halaman **User
  Management**. Perubahan role terdeteksi **live** (Supabase Realtime) — user
  yang sedang login otomatis pindah dari halaman "Menunggu Persetujuan" begitu
  admin approve, tanpa perlu logout/login ulang
- **Admin pertama**: tidak ada UI untuk ini secara sengaja — di-set manual lewat
  Supabase Table Editor (ubah kolom `role` jadi `admin` untuk user yang login
  pertama kali, sekarang di tabel `users`). Ini masih berlaku di model baru.

#### 4.7.1 Project Membership: Invite/Accept (V2 Phase 4, current)

- Akses ke sebuah project TIDAK LAGI lewat direct-add oleh admin/manager —
  sekarang lewat lifecycle **invite → accept/decline**:
  1. Manager/owner project buka Project Settings → tab Members → cari user
     lewat username (typeahead) → kirim undangan dengan role tertentu
     (`manager`/`supervisor`/`tester`/`member`)
  2. Invitee melihat undangan di dua tempat: bell notifikasi dan card
     "Pending Invitations" di halaman Home — accept atau decline
  3. Baru setelah **accept**, user itu benar-benar punya akses ke data
     project (test plan, test case, test run, dst) — status `invited` belum
     memberi akses apa pun
- **Notifikasi**: user diberi tahu (bell + badge unread) saat diundang ke
  project atau saat dikeluarkan dari project — dua tipe notifikasi yang ada
  saat ini. Belum ada notifikasi untuk kejadian lain (test run selesai, issue
  baru, dst) — di luar scope MVP saat ini, lihat `docs/ROADMAP_V2.md`
- **Visibility project**: `private` (default) / `unlisted` / `public` — diatur
  pemilik project dari tab Danger Zone. Public/unlisted project bisa dibaca
  tanpa jadi member; private tetap wajib invite+accept. Belum ada halaman
  browse/discover project public — sengaja tidak dibangun (lihat
  `docs/PRODUCT_CONSTITUTION.md`, Testify bukan social network/showcase)
- **Identity publik** (`/@username`): halaman lookup minimal (nama, avatar,
  bio) — berguna untuk verifikasi target undangan, bukan halaman portofolio

**Role per-project** (`project_members.role`) — lapisan RBAC kedua, di atas
role global, mengatur hak aksi *dalam* satu project tertentu:

| Role         | Edit konten (test plan/case/dll) | Hapus permanen | Jalankan test | Kelola issue |
| ------------ | :-------------------------------: | :------------: | :-----------: | :----------: |
| `manager`    | ✅ | ✅ | ✅ | ✅ |
| `supervisor` | ✅ | ❌ | ❌ | ❌ |
| `tester`     | ❌ | ❌ | ✅ | ✅ |
| `member`     | ❌ | ❌ | ❌ | ❌ (read-only) |

- User dengan role global `admin` selalu punya hak penuh di semua project,
  terlepas dari `project_members`-nya
- User dibuatkan Project otomatis jadi `manager` project itu (creator)
- Role per-project ini **independen** dari role global `user`/`admin` — dua
  orang yang sama-sama role global `user` bisa punya hak berbeda di project
  yang sama (satu `manager`, satu `member`)

### 4.8 User Management — Detail Aksi

> **V2 Phase 2**: aksi **Approve** dan **Cabut Akses** di bawah sudah
> **dihapus** dari halaman ini (tidak ada lagi konsep `pending` untuk
> di-approve/dicabut) — dipertahankan sebagai catatan historis. Aksi yang
> tersisa saat ini: List, Promote/Demote, Hapus (soft-delete), Detail.

Diadaptasi dari pola modul User di [amanah-pos](../amanah-pos), disesuaikan
untuk konteks Google OAuth (tidak ada password di sistem ini):

- **List**: email, nama, role (badge), tanggal terdaftar, sortable
- ~~**Approve**: `pending` → `user`~~ — dihapus (V2 Phase 2), tidak ada lagi
  gate approval
- ~~**Cabut Akses** (pengganti "reset password" amanah-pos)~~ — dihapus (V2
  Phase 2), tidak relevan lagi tanpa status `pending`
- **Promote/Demote**: toggle role `user` ↔ `admin`
- **Hapus**: soft-delete (`users.deleted_at`, tabel identity privat sejak V2
  Phase 1) — user tidak muncul lagi di daftar dan langsung kehilangan akses
  (RLS mengecek `deleted_at is null`), walau sesi Supabase Auth-nya sendiri
  tidak dihapus
- **Detail** (`/users/:id`): avatar, nama, email, role, tanggal terdaftar &
  update terakhir, User ID
- Admin tidak bisa melakukan hapus/demote pada akunnya sendiri (diproteksi
  di UI, dan sejak migrasi `20260725000011_prevent_self_role_change.sql`
  juga di RLS)

## 5. Out of Scope (sengaja tidak dibuat)

- Automated Testing, integrasi CI/CD, integrasi Git
- Requirement Management & Requirement Traceability
- Milestone, Environment Management, Build Integration
- Test Metrics tingkat lanjut (mis. flakiness tracking, trend analysis)
- Permission granular per-aksi (mis. "user boleh create tapi tidak boleh
  delete") — dua level role (admin/user) dianggap cukup
- Login email/password sebagai alternatif Google — sengaja dibatasi satu
  provider untuk kesederhanaan
- Notifikasi email/webhook — di luar scope, tapi catatan: notifikasi in-app
  minimal (bell + panel) SUDAH ada sejak V2 Phase 4, khusus untuk lifecycle
  undangan project (`project_invite`/`project_member_removed`). Notifikasi
  untuk kejadian lain (test run selesai, issue baru, dll) tetap di luar scope
- Multi-tenant / organization — schema-ready (`projects.owner_type`) tapi
  tabel `organizations` dan UI-nya belum dibangun, lihat
  `docs/ARCHITECTURE_V2.md` §4
- **Integrasi issue tracker eksternal dua arah** (mis. buat/sync issue via API
  GitHub/Jira) — yang dibuat hanya link URL yang bisa diklik, tanpa panggilan
  API eksternal sama sekali (lihat §3 Issue)
- **Import/export Excel** — belum diprioritaskan, tetap dicatat sebagai ide di
  §Roadmap
- **Reporting** (Dashboard interaktif, printable HTML/PDF, execution mode
  mobile) — desainnya cukup menyita waktu, sengaja **di-skip untuk iterasi
  ini**, tapi arahnya sudah disepakati ada tiga bentuk tsb (lihat §Roadmap)

Semua fitur di atas bisa ditambahkan di versi berikutnya tanpa mengubah
arsitektur inti (Project → Module → Test Case → Test Plan → Test Run → Test
Result → Issue).

## 6. Open Questions

- Apakah test case perlu versioning (riwayat perubahan steps/expected result)?
- Apakah perlu status "rejected" terpisah dari "pending" untuk user yang sengaja
  ditolak (saat ini reject = tetap `pending`, admin bisa approve ulang kapan
  saja)?
- Reporting (dashboard/PDF/HTML): belum didesain detail — struktur data apa
  yang perlu diagregasi, dan apakah PDF generation client-side (mis. print CSS
  / jsPDF) cukup mengingat arsitektur SPA murni tanpa backend custom untuk
  render server-side.

## 7. Roadmap Ideas (tidak prioritas)

- **Reporting** — tiga bentuk yang sudah disepakati arahnya, didesain detail
  saat waktunya tiba:
  1. Dashboard interaktif (ringkasan lintas project untuk QA manager/stakeholder)
  2. Printable report HTML/PDF (dokumentasi, testing manual)
  3. Execution mode — tampilan sederhana untuk eksekusi test run di HP
- Import/export Excel untuk test case
- Migrasi storage ke SQLite + backend PHP terpisah (lihat folder `backend/`,
  saat ini kosong) — juga kandidat tempat integrasi API issue tracker
  eksternal dua arah kalau nanti dibutuhkan (token tidak bisa aman di client
  SPA murni)
