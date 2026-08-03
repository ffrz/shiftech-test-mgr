# `@testmanager/agent-core`

Kontrak TypeScript bersama untuk boundary akses keluar Local Agent TestManager.
Paket ini sengaja tidak berisi implementasi dan tidak memiliki runtime dependency.

## Kontrak

- `TransportAdapter`: seluruh komunikasi dengan server pusat. Implementasi menangani
  protokol, retry, timeout, dan normalisasi error.
- `ExecutorAdapter`: menjalankan atau membatalkan job test dan mengembalikan hasil
  yang tidak bergantung pada Playwright maupun cloud executor tertentu.
- `ArtifactStorageAdapter`: menyimpan, membaca, dan menghapus bukti test tanpa
  membocorkan tipe SDK storage provider.
- `AuthAdapter`: memuat dan memperbarui credential di dalam boundary adapter.
  Secret tidak boleh keluar melalui identity, metadata, error, atau log.
- `RepoAdapter`: menyiapkan, membaca, dan melepaskan workspace source lokal maupun
  hasil clone. Implementasi wajib mencegah path traversal dan credential leakage.

Semua timestamp memakai string ISO 8601. Semua path pada operasi workspace bersifat
relatif terhadap `RepositoryWorkspace.rootPath`. Implementasi boleh menambahkan class
error sendiri, tetapi consumer tidak boleh bergantung pada SDK provider tertentu.

Implementasi `RunnerTokenAuth` dipakai bersama oleh proses runner dan MCP. Adapter
menyiapkan proof `p_token` untuk transport RPC, menyediakan identity yang aman untuk
telemetri, dan menghapus credential dari memori melalui `invalidate()`.

## Konfigurasi agent

`AGENT_ENV_SCHEMA`, `loadAgentEnv()`, dan `validateAgentEnv()` adalah satu-satunya
sumber skema, pemuatan `.env`, dan validasi konfigurasi untuk runner serta MCP.
Seluruh nama konfigurasi memakai prefix `TM_`. Nama `TM_*` yang tidak terdaftar
ditolak saat startup dan pesan error menyebut nama yang tidak dikenal agar typo
tidak berubah menjadi konfigurasi yang diam-diam diabaikan.

## Build

```bash
npm install
npm run build
```

Output ESM dan declaration TypeScript dibuat di `dist/`.
