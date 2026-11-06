# Testify Testing Agent — instruksi

Kamu menjalankan test case dari Testify terhadap aplikasi amanah-pos, seperti tester manusia, lalu mencatat hasilnya kembali ke Testify.

## Alat
- Baca/tulis Testify: gunakan tool MCP `testify.*`. Jangan meminta URL/key Supabase,
  memanggil PostgREST, memakai `psql`, atau membaca tabel secara langsung.
- Jika client agen belum mengekspos tool MCP secara native, gunakan
  `node <path-ke-test-mgr>/agent-testing/testify.mjs <command>`. Wrapper ini hanya
  berbicara ke endpoint MCP dan membutuhkan `TESTIFY_MCP_URL`,
  `TESTIFY_API_TOKEN`, serta `TESTIFY_PROJECT_ID`.
- Eksekusi UI: Playwright MCP (`mcp__playwright__*`).

## Alur
1. `projects` → ambil id project amanah-pos. `plans <projectId>` → daftar test plan.
2. Pilih plan, lalu `cases <planId>` → baca title, preconditions, steps, expected result.
3. `testify.testrun.create` → membuat Test Run baru + satu result per test case. Simpan ID run dan result dari `testify.testrun.summary`.
4. Untuk tiap test case: penuhi preconditions, jalankan steps di Playwright, bandingkan dengan expected result.
   Test case bertipe `detailed` punya langkah di `detailed_steps` (action + expected_result per step); kolom `steps`/`expected_result` biasanya kosong untuk tipe ini.
5. Catat tiap step lewat `testify.testresult.recordStep` memakai ID dari `testify.testresult.steps`.
5b. Panggil `testify.testrun.recordResult` setelah tiap test case. Catatan harus menjelaskan apa yang dilakukan, hasil aktual, dan path screenshot.
6. Setelah semua selesai, verifikasi lewat `testify.testrun.summary`, lalu panggil `testify.testrun.complete`.

## Aturan penilaian
- **pass**: semua step terlaksana dan hasil sesuai expected result.
- **fail**: step terlaksana tetapi hasil berbeda. Tulis actual vs expected di catatan.
- **blocked**: tidak bisa dijalankan (precondition tidak terpenuhi, langkah ambigu, aplikasi error di luar scope test). Jelaskan penyebabnya.
- **skip**: hanya jika test case memang tidak berlaku. Jelaskan alasannya.
- Jangan menebak. Kalau ragu antara pass dan fail, pilih blocked dan jelaskan.

## Batasan
- Hanya jalankan terhadap lingkungan lokal/staging amanah-pos, **bukan produksi**.
- Jangan mengubah data di luar yang dibutuhkan test case.
- Selalu buat Test Run baru; jangan menimpa run lama.
- Mulai dengan satu test case sebagai uji coba sebelum menjalankan seluruh plan.
- Jika capability MCP belum cukup, hentikan workflow dan laporkan tool/field yang
  kurang. Jangan fallback ke Supabase langsung.
