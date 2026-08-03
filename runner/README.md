# TestManager — Playwright Local Runner

CLI/agent yang menjalankan automation Playwright **di mesin lokal / on-prem**,
lalu melapor ke server pusat TestManager. Ini bagian "Local Runner" dari
Section 5 di [`../FEATURE_BACKLOG.md`](../FEATURE_BACKLOG.md).

## Rilis self-hosted

Dari root repository, jalankan `node scripts/release-runner.mjs` (atau
`npm run release:self-hosted` dari folder `runner/`). Skrip membangun runner dan
`agent-core`, lalu menghasilkan tarball, file `.sha256`, dan `release.json` di
`frontend/public/runner/`.

Setelah frontend dibangun dan di-deploy, halaman publik `/runner/install` menampilkan
perintah `npm i -g <url>` dan SHA256. Endpoint unduhan berada di
`/runner/tm-runner-<version>.tgz`; artefak hasil rilis tidak disimpan di Git.

## Kenapa runner terpisah?

Server pusat (Supabase + frontend) yang di-deploy self-hosted **tidak menjalankan
browser** dan sering tidak punya akses ke aplikasi yang diuji (localhost /
jaringan internal / VPN). Runner ini di-install di mesin yang **bisa mengakses
aplikasi under test**, lalu **konek keluar (outbound-only)** ke server pusat:

```
Mesin lokal (tester / on-prem)            Server pusat (self-hosted)
  Playwright Local Runner  ── poll ──▶   Supabase RPC (runner token)
        │                  ◀── job ──        │
   [npx playwright test]                     │
        │                  ── report ──▶   test_results + artifact metadata
```

Runner **tidak membuka port** apa pun — aman di balik NAT/firewall.

## Prasyarat

- Node.js 20+.
- Sebuah project Playwright (punya `playwright.config.*` dan file test) yang bisa
  menjalankan aplikasi under test. Runner memanggil Playwright via CLI, jadi
  versi Playwright mengikuti project itu.
- Migration `supabase/schema_024_p3_automation.sql` sudah dijalankan di Supabase.
- Sebuah runner sudah dibuat di UI (Automation → **Runner Baru**) — salin token
  sekali-tampilnya.

## Setup

```bash
cd runner
cp .env.example .env      # isi TM_SUPABASE_URL, TM_SUPABASE_ANON_KEY, TM_RUNNER_TOKEN, TM_PROJECT_DIR
chmod 600 .env            # wajib pada Linux/macOS; runner menolak file yang terbaca user lain
npm install               # hanya devDependency (TypeScript); runner tanpa runtime deps
npm run build
# Setelah memeriksa source dan playwright.config.*, trust folder satu kali:
node dist/index.js trust /absolute/path/to/playwright-project
npm start
# Browser terlihat untuk semua job pada sesi runner ini:
npm start -- --headed
# Browser terlihat dengan delay 250 ms per operasi:
npm start -- --slow-mo=250
# Playwright UI Mode (argumen setelah subcommand diteruskan ke Playwright):
npm start -- ui tests/smoke.spec.ts
# Playwright Inspector + PWDEBUG=1:
npm start -- debug tests/smoke.spec.ts
# Jalankan ulang otomatis ketika file *.spec.* / *.test.* berubah:
npm start -- watch tests
# Rekam script dan petakan ke Test Case yang dipilih di terminal:
npm start -- codegen https://app-under-test.example
# Deteksi script baru di repo dan tawarkan mapping ke Test Case manual:
npm start -- sync
# Buat project Playwright minimal baru di direktori ./e2e:
npm start -- init e2e
```

Subcommand `ui`, `debug`, dan `watch` berjalan langsung di `TM_PROJECT_DIR` dan
tidak melakukan polling maupun membutuhkan kredensial TestManager. `watch`
mengabaikan perubahan pada `node_modules`, `.git`, artifact, dan output report;
tekan Ctrl+C untuk berhenti.

`codegen` membutuhkan konfigurasi TestManager yang sama dengan mode `start`.
CLI menampilkan Test Case aktif dari proyek runner, membuka Playwright Codegen,
menyimpan hasil default ke `tests/<kode-test-case>.spec.ts`, dan baru memetakan
`script_ref` setelah Codegen ditutup dengan sukses serta file hasil tersedia.
Langkah manual terstruktur milik Test Case ditampilkan sebagai checklist terminal
sebelum Codegen dibuka, termasuk hasil yang diharapkan bila tersedia.

`sync` memindai `TM_PROJECT_DIR` untuk file `*.spec.*` dan `*.test.*`, lalu
membandingkannya dengan `script_ref` yang sudah tersimpan. Setiap script baru
ditawarkan satu per satu untuk dipetakan ke Test Case aktif yang belum memiliki
automation. Direktori dependency, Git, report, hasil test, dan artifact diabaikan;
isi source script tidak pernah dikirim ke server.

`init [directory]` membuat `package.json`, `playwright.config.ts`, `.gitignore`,
dan contoh test minimal. Subcommand ini tidak membutuhkan kredensial TestManager,
tidak menjalankan instalasi otomatis, dan membatalkan proses bila salah satu file
tujuan sudah ada agar project tester tidak tertimpa. Setelah init, jalankan
`npm install`, `npx playwright install`, lalu `npm test` dari direktori tersebut.

`script_ref` yang dikirim server (mis. `tests/login.spec.ts`) di-resolve relatif
terhadap repository pada Test Run. Untuk `local_path`, runner menggunakan path
lokal tersebut. Untuk repository remote, runner melakukan clone atau pull ke
`TM_REPOSITORY_CACHE_DIR` sebelum menjalankan script. Jika Test Run belum ditautkan
ke repository, `TM_PROJECT_DIR` menjadi fallback dan wajib berupa path absolut,
terbaca, serta menunjuk root git repository. Runner yang hanya menangani repository
remote tidak perlu menyiapkan source code lebih dulu.

Sebelum eksekusi, root Git harus dipercaya eksplisit satu kali melalui
`tm-runner trust <path>` (atau `node dist/index.js trust <path>` saat development).
Daftarnya disimpan lokal di `~/.config/testmanager/trusted-repositories.json`
(dapat dipindah lewat `TM_TRUST_STORE_PATH`) dengan permission `0600`. Runner
fail-closed untuk repo lain, termasuk clone remote baru: biarkan runner menyiapkan
clone, periksa repo beserta `playwright.config.*`, lalu trust path cache yang
ditampilkan oleh pesan penolakan dan jalankan runner kembali.
Trust sengaja berada di level repository karena Playwright memuat konfigurasi
Node sebelum file test. `script_ref` absolut, traversal, dan symlink keluar root
tetap ditolak sebagai lapisan tambahan.

Runner hanya mengizinkan invocation Playwright resmi yang tercantum di
`.env.example`; shell/wrapper arbitrer ditolak. Kredensial runner dan repository
tidak diteruskan ke proses Playwright. Nilai environment yang bernama sensitif
dimask sebagai `[REDACTED]` pada logger, live log, artifact log, dan fatal error.
File `.env` wajib berpermission `0600` pada sistem POSIX atau runner menolak start.

Credential private repository diambil bersama job saat runtime. Runner memasangnya
hanya pada environment proses Git, tidak pada URL/argumen command, konfigurasi Git,
file cache, artifact, atau log. `script_ref` dan `subdirectory` yang keluar dari
root repository ditolak.

Runner membaca branch aktif, commit SHA, serta status dirty/clean lewat Git.
Payload laporan hanya menyertakan path dan metadata tersebut; isi file source
tidak pernah dibaca untuk dikirim maupun dimasukkan ke payload server pusat.

## Cara kerja

1. **Heartbeat** saat start (fail-fast kalau token ditolak) lalu tiap
   `TM_HEARTBEAT_INTERVAL_SECONDS` → UI menampilkan Online/Offline.
2. **Poll** `poll_automation_job`; server mengklaim satu job antre yang
   `required_labels`-nya subset dari label runner (`FOR UPDATE SKIP LOCKED`,
   aman untuk banyak runner).
3. **Prepare + execute**: clone/pull repository yang ditautkan, lalu jalankan
   `npx playwright test <script_ref> --output=artifacts/<jobId> --trace=on`
   dari root/subdirectory repository, dengan timeout `TM_JOB_TIMEOUT_SECONDS`.
4. **Report** `report_automation_job`: exit code 0 → `pass`, selain itu → `fail`
   (timeout/spawn error → `blocked`). Kalau gagal dan masih ada sisa attempt,
   runner meminta `retry` dan server mengembalikan job ke antrean.

## Konfigurasi (`.env`)

Lihat [`.env.example`](.env.example) untuk daftar lengkap dan penjelasan tiap
variabel (URL server, token, direktori project, interval poll/heartbeat, timeout,
dan opsi artifact).

Mode interaktif dapat dijadikan default melalui `TM_PLAYWRIGHT_HEADED=true` dan
`TM_PLAYWRIGHT_SLOW_MO_MS=<milidetik>`. Nilai `headed`/`slow_mo_ms` pada payload
job memiliki prioritas lebih tinggi. Karena Playwright Test tidak menyediakan
flag CLI `--slow-mo`, project Playwright perlu meneruskan env runner ini:

```ts
export default defineConfig({
  use: {
    launchOptions: {
      slowMo: Number(process.env.TM_PLAYWRIGHT_SLOW_MO_MS || 0),
    },
  },
});
```

Job membawa `browser` (`chromium`, `firefox`, atau `webkit`) dan
`device_profile`. Browser diterapkan langsung melalui CLI Playwright, sedangkan
profil perangkat diteruskan sebagai `TM_PLAYWRIGHT_DEVICE_PROFILE`. Konfigurasi
Playwright dapat mengaktifkan emulasi mobile dengan profil tersebut:

```ts
import { defineConfig, devices } from '@playwright/test';
const profile = process.env.TM_PLAYWRIGHT_DEVICE_PROFILE;
export default defineConfig({
  use: profile && profile in devices ? devices[profile as keyof typeof devices] : {},
});
```

Set `TM_PLAYWRIGHT_VIEWPORT=WIDTHxHEIGHT` jika konfigurasi project mengubah
viewport default Playwright. Setiap laporan hasil menyertakan browser dan versi
binary browser yang dipakai Playwright, OS, viewport, base URL/build version dari Test
Run, serta commit SHA repository yang sudah disiapkan runner.

## Label / routing

Label runner = kapabilitas yang diiklankan (mis. `chromium`, `staging`,
`vpn-internal`). Saat memetakan script ke Test Case di UI, isi **Label runner**
agar job hanya diambil runner yang cocok. Job tanpa label bisa diambil runner mana
pun di project yang sama.

## Artifact

Runner mengumpulkan screenshot/video/trace/console log/network HAR/DOM snapshot
dari output Playwright dan
melaporkan **metadata**-nya. Seluruh bundle wajib berhasil di-upload ke bucket
private `automation-artifacts`; job akan berstatus `blocked` dan di-retry jika
signing atau salah satu upload gagal agar metadata parsial tidak tersimpan.
Jika kosong, dilaporkan sebagai path `file://`. Upload binary ke Storage
(Supabase/S3/MinIO) adalah deliverable terpisah.

Project Playwright wajib menerapkan kebijakan `screenshot: 'only-on-failure'`,
`video: 'retain-on-failure'`, dan `trace: 'retain-on-failure'`. Contoh siap pakai
ada di `example-project/playwright.config.ts`; fixture otomatis
`example-project/tests/observability.ts` wajib diimpor oleh spec agar console
browser bertimestamp, HAR, serta HTML DOM dan computed style penting dibuat pada
titik gagal. Semua bukti ditempatkan di output test per job sehingga ikut dalam
upload artifact runner.

Jika opsi **Pause & inspect saat gagal** diaktifkan pada job, runner memaksa mode
headed dan meneruskan `TM_PAUSE_ON_FAILURE=1`. Fixture observability memanggil
`page.pause()` setelah seluruh bukti kegagalan dikumpulkan, sehingga browser dan
state halaman tetap terbuka. Tester menekan **Resume** di Playwright Inspector
untuk melanjutkan teardown dan pelaporan job. Saat fixture mengumumkan bahwa
pause sudah aktif, timeout job dihentikan agar sesi inspeksi tidak diputus oleh
runner; timeout tetap berlaku normal sebelum terjadi kegagalan. Karena pause dipasang lewat fixture,
spec yang ingin memakai opsi ini wajib mengimpor `test` dari fixture
`observability.ts` seperti contoh project runner.

## Step-through control channel

Saat sebuah job berstatus `running`, UI dapat mengirim perintah `next` atau
`continue`. Runner mengambil command queue lewat polling HTTPS outbound yang sama,
lalu meneruskannya ke stdin proses Playwright sebagai satu JSON per baris:

```json
{"type":"step-control","command":"next"}
```

Child process menerima `TM_STEP_CONTROL_CHANNEL=stdin-jsonl`. Fixture/helper
Playwright proyek under test dapat membaca channel ini untuk mengendalikan pause
antar-step. Runner tidak membuka port lokal maupun koneksi inbound dari server.

## Docker

Docker **bukan jalur default untuk laptop tester**. Sesuai Section 14.3, gunakan
`npx` atau instalasi npm global agar runner dan Playwright dapat mengakses
aplikasi lokal secara langsung. Image Docker ditujukan terutama untuk mesin
bersama atau lingkungan on-prem.

Di dalam container, `localhost` menunjuk ke container itu sendiri, bukan ke host.
Jika aplikasi under test berjalan di host, pilih konfigurasi jaringan yang sesuai:

- Linux: tambahkan `--network host`, lalu URL seperti `http://localhost:3000`
  akan mengarah ke service di host.
- Docker Desktop (macOS/Windows): gunakan `host.docker.internal` pada URL aplikasi,
  misalnya `http://host.docker.internal:3000`.

```bash
docker build -t testmanager-local-runner .
# Contoh Linux untuk mengakses aplikasi yang berjalan di host:
docker run --rm --env-file .env \
  --network host \
  -v /path/to/playwright-project:/project \
  -e TM_PROJECT_DIR=/project \
  testmanager-local-runner
```

Base image `mcr.microsoft.com/playwright` sudah menyertakan browser + dependency
OS-nya. Pastikan `baseURL` atau URL target di project Playwright memakai alamat
host yang benar untuk mode jaringan di atas.
