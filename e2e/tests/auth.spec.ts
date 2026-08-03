import { test, expect } from '@playwright/test';

// These cases run against the E2E dummy account (email provider session injected
// via global-setup.ts). Google OAuth UI flow is not automated here — a real
// Google account requires phone verification in a fresh browser session.

// TC-0047 — Login dengan Google OAuth berhasil.
// Adapted: a real Supabase session (dummy account) must boot the app straight
// into the authenticated home page, with the topbar visible and no login screen.
test('TC-0047 login with Google OAuth', async ({ page }) => {
  await page.goto('/app/');

  // Authenticated home page loads (topbar is only rendered behind ProtectedRoute).
  await expect(page.locator('.layout-topbar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);
});

// TC-0051 — Logout dari aplikasi. User sudah login (storageState dari global-setup).
test('TC-0051 logout', async ({ page }) => {
  await page.goto('/app/');

  await expect(page.locator('.layout-topbar')).toBeVisible();

  // Open the user menu (avatar) in the topbar and click "Sign Out".
  const menuButton = page.getByRole('button', { name: 'User menu' });
  await menuButton.click();

  const signOut = page.locator('.p-menuitem:has-text("Sign Out")').first();
  await signOut.click();

  // After sign out, the app hard-redirects to /app/login.
  await page.waitForURL('**/app/login', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});

// TC-0121 — Route /login mengarahkan user yang sudah login.
test('TC-0121 logged-in user visiting /login is redirected', async ({ page }) => {
  await page.goto('/app/login');

  // Per Product behavior: a logged-in user hitting /login should be redirected
  // away from the login screen (to the app home).
  await page.waitForTimeout(1500);
  const isStillOnLogin = await page.getByRole('button', { name: 'Sign in with Google' }).isVisible().catch(() => false);
  expect(isStillOnLogin).toBe(false);
});
