import assert from 'node:assert/strict';
import test from 'node:test';
import { codegenScriptRef, createCodegenInvocation, formatCodegenChecklist } from '../dist/codegen.js';
import { parseCliInput } from '../dist/config.js';
import { discoverPlaywrightScripts, unmappedScripts } from '../dist/sync.js';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('command codegen mewajibkan tepat satu URL HTTP(S)', () => {
  assert.deepEqual(parseCliInput(['codegen', 'https://app.example.test/login']), {
    command: 'codegen', options: {}, playwrightArgs: [], codegenUrl: 'https://app.example.test/login',
  });
  assert.throws(() => parseCliInput(['codegen']), /Usage/);
  assert.throws(() => parseCliInput(['codegen', 'file:\/\/private']), /HTTP\(S\)/);
});

test('command sync tidak menerima argumen tambahan', () => {
  assert.deepEqual(parseCliInput(['sync']), { command: 'sync', options: {}, playwrightArgs: [] });
  assert.throws(() => parseCliInput(['sync', 'tests']), /Usage/);
});

test('sync menemukan script Playwright dan mengabaikan output serta dependency', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tm-runner-sync-'));
  await mkdir(join(root, 'tests'), { recursive: true });
  await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
  await mkdir(join(root, 'test-results'), { recursive: true });
  await writeFile(join(root, 'tests', 'login.spec.ts'), 'test()');
  await writeFile(join(root, 'tests', 'checkout.test.js'), 'test()');
  await writeFile(join(root, 'tests', 'helper.ts'), 'export {}');
  await writeFile(join(root, 'node_modules', 'pkg', 'hidden.spec.ts'), 'test()');
  await writeFile(join(root, 'test-results', 'retry.spec.ts'), 'test()');

  assert.deepEqual(await discoverPlaywrightScripts(root), ['tests/checkout.test.js', 'tests/login.spec.ts']);
  assert.deepEqual(unmappedScripts(['tests/checkout.test.js', 'tests/login.spec.ts'], [
    { script_ref: 'tests/login.spec.ts' }, { script_ref: null },
  ]), ['tests/checkout.test.js']);
});

test('checklist codegen menampilkan langkah manual dan expected result secara berurutan', () => {
  const checklist = formatCodegenChecklist({
    code: 'TC-0042',
    title: 'Login berhasil',
    steps: [
      { step_number: 1, action: 'Buka halaman login', expected_result: null },
      { step_number: 2, action: 'Klik tombol Masuk', expected_result: 'Dashboard tampil' },
    ],
  });
  assert.match(checklist, /\[ \] 1\. Buka halaman login/);
  assert.match(checklist, /\[ \] 2\. Klik tombol Masuk/);
  assert.match(checklist, /Hasil yang diharapkan: Dashboard tampil/);
  assert.ok(checklist.indexOf('[ ] 1.') < checklist.indexOf('[ ] 2.'));
});

test('invocation codegen membuang subcommand test dan menentukan file dari kode Test Case', () => {
  assert.equal(codegenScriptRef({ code: 'TC-0042' }), 'tests/tc-0042.spec.ts');
  assert.deepEqual(createCodegenInvocation({ playwrightCmd: 'npx playwright test' }, 'https://app.test', '/repo/tests/tc.spec.ts'), {
    command: 'npx', args: ['playwright', 'codegen', 'https://app.test', '--output', '/repo/tests/tc.spec.ts'],
  });
});
