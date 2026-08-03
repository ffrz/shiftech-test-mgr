import { test, expect } from './observability';

// A passing spec — maps to a Test Case whose automation should end up PASS.
// script_ref to use in the app: tests/smoke.spec.ts
test('homepage loads and has a title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
