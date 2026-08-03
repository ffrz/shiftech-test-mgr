import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseRpcError } from '@testmanager/agent-core';
import { Runner } from '../dist/runner.js';

const config = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  runnerToken: 'runner-token',
  projectDir: '/tmp/testmanager-project',
  repositoryCacheDir: '/tmp/testmanager-repositories',
  playwrightCmd: 'npx playwright test',
  trustedRepositories: [],
  headed: false,
  slowMoMs: 0,
  pollIntervalMs: 1,
  heartbeatIntervalMs: 60_000,
  jobTimeoutMs: 1_000,
  artifactDir: '/tmp/testmanager-artifacts',
  artifactUpload: false,
};

test('Runner berhenti pada poll pertama setelah token dicabut dan tidak retry tanpa batas', async () => {
  let pollCount = 0;
  const api = {
    async heartbeat() {
      return { agent_id: 'runner-1', active: true, last_seen_at: 'now', server_version: '0.1.0', minimum_supported_runner_version: '0.1.0' };
    },
    // Loop runner memanggil pollDiagnostic() sebelum poll(). Tanpa stub ini,
    // pemanggilannya melempar TypeError yang tertangkap catch umum, lalu loop
    // berputar selamanya dan test menggantung — bukan gagal.
    async pollDiagnostic() {
      return null;
    },
    async poll() {
      pollCount += 1;
      throw new SupabaseRpcError(
        'RPC poll_automation_job failed (400): INVALID_RUNNER_TOKEN',
        400,
      );
    },
  };
  const executor = { async execute() { throw new Error('tidak boleh dieksekusi'); } };
  const artifactStorage = { async store() { throw new Error('tidak boleh di-upload'); } };
  const runner = new Runner(config, executor, artifactStorage, api);

  await assert.rejects(
    runner.start(),
    /Token runner ditolak server karena sudah dicabut, dirotasi, atau tidak valid\. Hubungkan ulang runner dengan token baru\./,
  );
  assert.equal(pollCount, 1);
});

test('Runner menolak berjalan ketika versinya di bawah minimum server', async () => {
  let pollCount = 0;
  const api = {
    async heartbeat() {
      return { agent_id: 'runner-1', active: true, last_seen_at: 'now', server_version: '1.0.0', minimum_supported_runner_version: '0.2.0' };
    },
    async pollDiagnostic() { return null; },
    async poll() { pollCount += 1; return null; },
  };
  const runner = new Runner(config, { async execute() {} }, { async store() {} }, api);

  await assert.rejects(runner.start(), /Versi runner 0\.1\.0 tidak lagi didukung server.*0\.2\.0/);
  assert.equal(pollCount, 0);
});
