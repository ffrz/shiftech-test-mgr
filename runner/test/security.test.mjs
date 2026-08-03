import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import {
  assertPathInsideRepository,
  assertTrustedRepository,
  childProcessEnvironment,
  parseAllowedPlaywrightCommand,
  redactSecrets,
  registerSecret,
  SecretRedactorStream,
} from '../dist/security.js';

test('trust berlaku tepat pada root repository dan bukan parent directory', () => {
  const parent = mkdtempSync(join(tmpdir(), 'tm-trust-'));
  const repository = join(parent, 'repository');
  mkdirSync(repository);
  assert.equal(assertTrustedRepository(repository, [repository]), repository);
  assert.throws(() => assertTrustedRepository(repository, [parent]), /belum dipercaya/);
});

test('script_ref melalui symlink yang keluar repository ditolak', () => {
  const repository = mkdtempSync(join(tmpdir(), 'tm-repository-'));
  const outside = mkdtempSync(join(tmpdir(), 'tm-outside-'));
  const outsideTest = join(outside, 'escape.spec.ts');
  writeFileSync(outsideTest, '');
  const linkedTest = join(repository, 'escape.spec.ts');
  symlinkSync(outsideTest, linkedTest);
  assert.throws(() => assertPathInsideRepository(repository, linkedTest), /di luar root/);
});

test('command Playwright hanya menerima invocation eksplisit yang diizinkan', () => {
  assert.deepEqual(parseAllowedPlaywrightCommand('npx playwright test'), { command: 'npx', args: ['playwright', 'test'] });
  assert.throws(() => parseAllowedPlaywrightCommand('sh -c "npx playwright test"'), /tidak diizinkan/);
  assert.throws(() => parseAllowedPlaywrightCommand('npx playwright test; env'), /tidak diizinkan/);
});

test('secret direduksi dari teks, stream lintas chunk, dan environment child', () => {
  const secret = 'adm02-secret-value';
  registerSecret(secret);
  assert.equal(redactSecrets(`crash: ${secret}`), 'crash: [REDACTED]');
  const stream = new SecretRedactorStream();
  const output = stream.write('crash: adm02-') + stream.write('secret-value') + stream.flush();
  assert.equal(output, 'crash: [REDACTED]');

  const previous = process.env.ADM02_API_KEY;
  process.env.ADM02_API_KEY = secret;
  try {
    const childEnv = childProcessEnvironment({ SAFE_VALUE: 'ok' });
    assert.equal(childEnv.ADM02_API_KEY, undefined);
    assert.equal(childEnv.SAFE_VALUE, 'ok');
  } finally {
    if (previous === undefined) delete process.env.ADM02_API_KEY;
    else process.env.ADM02_API_KEY = previous;
  }
});
