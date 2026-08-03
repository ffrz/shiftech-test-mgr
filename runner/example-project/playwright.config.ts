import { defineConfig } from '@playwright/test';

// Failure evidence is retained in the per-job output directory supplied by the
// runner. Console, HAR, and DOM evidence is installed by tests/observability.ts.
export default defineConfig({
  testDir: '.',
  reporter: 'list',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
