import { defineConfig, devices } from '@playwright/test';

// Root-level config so the Local Runner (runner/), which spawns
// `npx playwright test <script_ref>` with cwd = TM_PROJECT_DIR (the repo
// root), can find a config without needing a "subdirectory" job field this
// repo hasn't wired up yet. Mirrors e2e/playwright.config.ts, just with paths
// rebased from repo root and headless by default (automation runs, not local
// interactive debugging).
//
// No `projects` array: the runner's executor always passes --browser=<name>
// (runner/src/playwrightLocalExecutor.ts), and Playwright's CLI rejects
// --browser when the config defines its own projects. use.<options> below
// applies directly to that CLI-selected browser project instead.
export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    viewport: { width: 1280, height: 800 },
    storageState: './e2e/.auth/user.json',
  },
});
