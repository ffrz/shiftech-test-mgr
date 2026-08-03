import test from 'node:test';
import assert from 'node:assert/strict';
import { collectEnvironmentMetadata } from '../dist/environmentMetadata.js';

const job = {
  base_url: 'https://staging.example.test',
  build_version: '2026.08.1',
};

test('mengumpulkan seluruh metadata lingkungan laporan runner', () => {
  const previous = process.env.TM_PLAYWRIGHT_VIEWPORT;
  process.env.TM_PLAYWRIGHT_VIEWPORT = '1440x900';
  try {
    const metadata = collectEnvironmentMetadata(
      job,
      { browser: 'firefox', deviceProfile: null },
      { path: '/repo', branch: 'main', commitSha: 'abc123', dirty: false },
      '/repo',
      () => '1.55.0',
    );
    assert.deepEqual(metadata.viewport, { width: 1440, height: 900 });
    assert.equal(metadata.browser, 'firefox');
    assert.equal(metadata.browserVersion, '1.55.0');
    assert.equal(metadata.baseUrl, job.base_url);
    assert.equal(metadata.buildVersion, job.build_version);
    assert.equal(metadata.commitSha, 'abc123');
    assert.match(metadata.os, /\S+ \S+/);
  } finally {
    if (previous === undefined) delete process.env.TM_PLAYWRIGHT_VIEWPORT;
    else process.env.TM_PLAYWRIGHT_VIEWPORT = previous;
  }
});

test('memakai viewport default dan metadata nullable saat sumber tidak tersedia', () => {
  const previous = process.env.TM_PLAYWRIGHT_VIEWPORT;
  delete process.env.TM_PLAYWRIGHT_VIEWPORT;
  try {
    const metadata = collectEnvironmentMetadata({}, { browser: 'chromium', deviceProfile: null }, undefined, '/repo', () => 'unknown');
    assert.deepEqual(metadata.viewport, { width: 1280, height: 720 });
    assert.equal(metadata.baseUrl, null);
    assert.equal(metadata.buildVersion, null);
    assert.equal(metadata.commitSha, null);
  } finally {
    if (previous !== undefined) process.env.TM_PLAYWRIGHT_VIEWPORT = previous;
  }
});
