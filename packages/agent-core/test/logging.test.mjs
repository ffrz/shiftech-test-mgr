import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SecretRedactorStream,
  createLogger,
  formatCrash,
  installCrashHandlers,
  redactSecrets,
  redactValue,
  registerEnvironmentSecrets,
  registerSecret,
} from '../dist/index.js';

test('runner token, bootstrap code, dan kredensial repo tidak lolos dari log maupun crash', () => {
  const runnerToken = 'runner-token-fixture-unique';
  const bootstrapCode = 'bootstrap-code-fixture-unique';
  const repoPassword = 'repo-password-fixture-unique';
  registerSecret(runnerToken);
  registerEnvironmentSecrets({ TM_BOOTSTRAP_CODE: bootstrapCode, REPO_CREDENTIAL: repoPassword });

  const lines = [];
  const log = createLogger('test', (line) => lines.push(line));
  const crash = new Error(`crash ${runnerToken} ${bootstrapCode}`);
  log.error(`failed Bearer ${runnerToken}`, {
    bootstrapCode,
    repositoryUrl: `https://user:${repoPassword}@example.test/repo.git`,
    crash: formatCrash(crash),
  });

  const output = lines.join('\n');
  for (const secret of [runnerToken, bootstrapCode, repoPassword]) assert.equal(output.includes(secret), false);
  assert.match(output, /\[REDACTED\]/);
});

test('handler crash global melewati logger teredaksi sebelum exit', () => {
  const secret = 'fatal-handler-secret-fixture';
  registerSecret(secret);
  const lines = [];
  const log = createLogger('crash-test', (line) => lines.push(line));
  let exitCode;
  installCrashHandlers(log, (code) => { exitCode = code; throw new Error('test exit'); });
  const handler = process.rawListeners('uncaughtException').at(-1);
  assert.ok(handler);
  process.removeListener('uncaughtException', handler);
  assert.throws(() => handler(new Error(`fatal ${secret}`)), /test exit/);
  assert.equal(exitCode, 1);
  assert.equal(lines.join('').includes(secret), false);
  const rejectionHandler = process.rawListeners('unhandledRejection').at(-1);
  if (rejectionHandler) process.removeListener('unhandledRejection', rejectionHandler);
});

test('redaksi mencakup object bersiklus, field sensitif, base64, dan stream lintas chunk', () => {
  const secret = 'cross-chunk-secret-fixture';
  registerSecret(secret);
  const circular = { apiToken: 'unknown-token-that-must-mask' };
  circular.self = circular;
  const safe = JSON.stringify(redactValue(circular));
  assert.equal(safe.includes('unknown-token-that-must-mask'), false);
  assert.equal(redactSecrets(Buffer.from(secret).toString('base64')), '[REDACTED]');

  const stream = new SecretRedactorStream();
  const output = stream.write('prefix cross-chunk-') + stream.write('secret-fixture suffix') + stream.flush();
  assert.equal(output, 'prefix [REDACTED] suffix');
});
