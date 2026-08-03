import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PlaywrightLocalExecutor } from '../dist/playwrightLocalExecutor.js';

function makeConfig(projectDir) {
  return {
    projectDir,
    artifactDir: join(projectDir, 'artifacts'),
    playwrightCmd: 'npx playwright test',
    jobTimeoutMs: 1_000,
    slowMoMs: 0,
    headed: false,
  };
}

test('PlaywrightLocalExecutor blocks script paths outside the repository', async () => {
  const projectDir = await mkdtemp(join(tmpdir(), 'tm-executor-'));
  try {
    const executor = new PlaywrightLocalExecutor();
    const outcome = await executor.execute({
      config: makeConfig(projectDir),
      projectDir,
      job: { id: 'job-1', script_ref: '../outside.spec.ts' },
    });

    assert.equal(outcome.result, 'blocked');
    assert.match(outcome.errorMessage, /di luar root repository/);
    assert.deepEqual(outcome.artifacts, []);
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
});

test('PlaywrightLocalExecutor cancel is idempotent for unknown jobs', async () => {
  const executor = new PlaywrightLocalExecutor();
  await assert.doesNotReject(executor.cancel('unknown-job'));
});
