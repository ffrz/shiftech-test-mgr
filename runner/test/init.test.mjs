import assert from 'node:assert/strict';
import test from 'node:test';
import { chmod, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, parseCliInput } from '../dist/config.js';
import { bootstrapRunner } from '../dist/init.js';

test('command init hanya menerima bootstrap code eksplisit', () => {
  const code = `tmb_${'a'.repeat(48)}`;
  assert.deepEqual(parseCliInput(['init', '--code', code]), { command: 'init', options: {}, playwrightArgs: [], initCode: code });
  assert.throws(() => parseCliInput(['init']), /Usage/);
  assert.throws(() => parseCliInput(['init', code]), /Usage/);
  assert.throws(() => parseCliInput(['init', '--code', code, 'extra']), /Usage/);
});

test('init menukar code, menulis config 0600, lalu mengirim heartbeat tanpa mengekspos token', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tm-runner-init-'));
  const code = `tmb_${'b'.repeat(48)}`;
  const calls = [];
  const transport = { async request(request) {
    calls.push(request);
    if (request.operation === 'redeem_agent_bootstrap_code') {
      return { data: { runner: { id: 'runner-1', project_id: 'project-1', name: 'Runner Aman', labels: [] } } };
    }
    return { data: { active: true } };
  } };
  let output = '';
  await bootstrapRunner(code, {
    cwd: root,
    env: { TM_SUPABASE_URL: 'https://example.test', TM_SUPABASE_ANON_KEY: 'anon-public', TM_RUNNER_NAME: 'Runner CI', TM_RUNNER_LABELS: ' Chromium, staging,chromium ' },
    transport,
    stdout: { write(value) { output += value; return true; } },
  });

  assert.deepEqual(calls.map((call) => call.operation), ['redeem_agent_bootstrap_code', 'heartbeat_local_agent']);
  const token = calls[0].body.p_runner_token;
  assert.match(token, /^tm_[A-Za-z0-9_-]{48}$/);
  assert.equal(calls[0].body.p_runner_name, 'Runner CI');
  assert.deepEqual(calls[0].body.p_runner_labels, ['chromium', 'staging']);
  assert.equal(calls[1].auth.body.p_token, token);
  const config = await readFile(join(root, '.env'), 'utf8');
  assert.match(config, new RegExp(`TM_RUNNER_TOKEN=${token}`));
  assert.equal((await stat(join(root, '.env'))).mode & 0o777, 0o600);
  assert.doesNotMatch(output, new RegExp(token));
  assert.doesNotMatch(output, new RegExp(code));
  assert.match(output, /Runner Aman.*project-1/);
  assert.match(output, /runner menjalankan kode dari repo yang kamu tautkan, di mesin ini/);
  assert.match(output, /mengeksekusi playwright\.config\.ts sebagai kode Node sebelum satu test pun berjalan/);
});

test('runner menolak file config yang dapat dibaca group atau user lain', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX file permissions tidak tersedia di Windows');
    return;
  }

  const root = await mkdtemp(join(tmpdir(), 'tm-runner-config-'));
  const configPath = join(root, '.env');
  await writeFile(configPath, [
    'TM_SUPABASE_URL=https://example.test',
    'TM_SUPABASE_ANON_KEY=anon-public',
    'TM_RUNNER_TOKEN=tm_private',
    `TM_PROJECT_DIR=${root}`,
    `TM_TRUSTED_REPOSITORIES=${root}`,
    '',
  ].join('\n'), { mode: 0o600 });

  assert.doesNotThrow(() => loadConfig(configPath));
  await chmod(configPath, 0o644);
  assert.throws(
    () => loadConfig(configPath),
    /Agent config must be private \(chmod 600\)/,
  );
});
