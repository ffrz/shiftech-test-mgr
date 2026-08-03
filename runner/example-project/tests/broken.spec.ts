import { test, expect } from './observability';

// A deliberately failing spec — use it to verify the FAIL + artifact + retry
// path. Map it to a second Test Case with script_ref: tests/broken.spec.ts
test('this assertion fails on purpose', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/ThisTitleDoesNotExist/);
});
