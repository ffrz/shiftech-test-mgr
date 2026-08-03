import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCliInput, parseCliOptions } from '../dist/config.js';
import { resolveExecutionMode, resolveExecutionTarget } from '../dist/executor.js';
import { createInteractiveInvocation } from '../dist/interactive.js';

const config = { headed: false, slowMoMs: 0 };
const job = { headed: undefined, slow_mo_ms: null };

test('CLI headed dan slow-mo diparse, slow-mo otomatis headed', () => {
  assert.deepEqual(parseCliOptions(['--headed']), { headed: true });
  assert.deepEqual(parseCliOptions(['--slow-mo', '250']), { slowMoMs: 250, headed: true });
  assert.deepEqual(parseCliOptions(['--slow-mo=100']), { slowMoMs: 100, headed: true });
  assert.throws(() => parseCliOptions(['--slow-mo=-1']), /integer milidetik/);
});

test('subcommand interaktif dan argumen Playwright diparse tanpa opsi server', () => {
  assert.deepEqual(parseCliInput(['ui', 'tests/login.spec.ts', '--project=chromium']), {
    command: 'ui', options: {}, playwrightArgs: ['tests/login.spec.ts', '--project=chromium'],
  });
  assert.deepEqual(parseCliInput(['debug']), { command: 'debug', options: {}, playwrightArgs: [] });
  assert.deepEqual(parseCliInput(['watch', 'tests']), { command: 'watch', options: {}, playwrightArgs: ['tests'] });
  assert.deepEqual(parseCliInput(['start', '--headed']), { command: 'start', options: { headed: true }, playwrightArgs: [] });
});

test('invocation UI, debug, dan watch dibentuk sesuai Playwright', () => {
  const interactiveConfig = { projectDir: '/tmp/project', playwrightCmd: 'npx playwright test', trustedRepositories: ['/tmp/project'] };
  assert.deepEqual(createInteractiveInvocation(interactiveConfig, 'ui', ['smoke.spec.ts']).args, ['playwright', 'test', 'smoke.spec.ts', '--ui']);
  const debug = createInteractiveInvocation(interactiveConfig, 'debug', []);
  assert.deepEqual(debug.args, ['playwright', 'test', '--debug']);
  assert.equal(debug.env.PWDEBUG, '1');
  assert.deepEqual(createInteractiveInvocation(interactiveConfig, 'watch', ['tests']).args, ['playwright', 'test', 'tests']);
});

test('target browser dan device profile divalidasi dari payload job', () => {
  assert.deepEqual(resolveExecutionTarget({ browser: 'webkit', device_profile: 'iPhone 13' }), { browser: 'webkit', deviceProfile: 'iPhone 13' });
  assert.deepEqual(resolveExecutionTarget({}), { browser: 'chromium', deviceProfile: null });
  assert.throws(() => resolveExecutionTarget({ browser: 'chrome' }), /tidak didukung/);
  assert.throws(() => resolveExecutionTarget({ device_profile: '../invalid' }), /tidak valid/);
});

test('opsi job mengalahkan default runner', () => {
  assert.deepEqual(resolveExecutionMode({ ...config, headed: true, slowMoMs: 50 }, { ...job, headed: false, slow_mo_ms: 10 }), {
    headed: false,
    slowMoMs: 10,
    pauseOnFailure: false,
  });
});

test('slow-mo job tanpa headed eksplisit mengaktifkan browser terlihat', () => {
  assert.deepEqual(resolveExecutionMode(config, { ...job, slow_mo_ms: 75 }), { headed: true, slowMoMs: 75, pauseOnFailure: false });
});

test('pauseOnFailure selalu mengaktifkan browser terlihat', () => {
  assert.deepEqual(resolveExecutionMode(config, { ...job, headed: false, pause_on_failure: true }), { headed: true, slowMoMs: 0, pauseOnFailure: true });
});
