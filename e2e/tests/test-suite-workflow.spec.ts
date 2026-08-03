import { test, expect, type Locator, type Page } from '@playwright/test';

// Test plan TP-0007 — "Test Suite - Full Workflow"
// TC-0079 Create suite → TC-0080 add item → TC-0126 edit suite → TC-0127 edit item
// → TC-0128 delete item → TC-0129 visibility public → TC-0130 delete suite.
// Runs serially against the E2E dummy account (session injected via global-setup).
// Each case leaves the state needed by the next one; the final case cleans up.

const suiteName = `E2E Workflow Suite ${Date.now()}`;
const updatedSuiteName = `${suiteName} Updated`;
const itemTitle = `E2E Item ${Date.now()}`;
const updatedItemTitle = `${itemTitle} Updated`;

let suiteUrl = '';

test.describe.configure({ mode: 'serial' });

test.describe('TP-0007 Test Suite - Full Workflow', () => {
  test('TC-0079 Membuat Test Suite baru', async ({ page }) => {
    await page.goto('/app/test-suites');
    await expect(page.locator('.layout-topbar')).toBeVisible();

    await page.getByRole('button', { name: 'New Suite' }).click();
    await page.locator('#suite-name').fill(suiteName);
    await page.locator('#suite-description').fill('Workflow E2E suite created via Playwright');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await page.waitForURL('**/app/test-suites/*', { timeout: 30_000 });
    suiteUrl = page.url();

    await expect(page.locator('h2')).toHaveText(suiteName);
  });

  test('TC-0080 Menambahkan item ke Test Suite', async ({ page }) => {
    await page.goto(suiteUrl);
    await expect(page.locator('.layout-topbar')).toBeVisible();

    await page.getByRole('button', { name: 'New Item' }).click();
    await page.locator('#item-title').fill(itemTitle);
    await page.locator('#item-module').fill('Auth');
    await page.locator('#item-steps').fill('1. Open the page;2. Do the thing');
    await page.locator('#item-expected').fill('The thing happens');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.p-datatable-tbody')).toContainText(itemTitle);
  });

  test('TC-0126 Mengedit Test Suite (nama/deskripsi/visibility)', async ({ page }) => {
    await page.goto(suiteUrl);
    await expect(page.locator('.layout-topbar')).toBeVisible();

    await page.locator('.header-actions button:has(.pi-pencil)').click();
    await page.locator('#suite-name').fill(updatedSuiteName);
    await page.locator('#suite-description').fill('Suite updated via E2E workflow');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('h2')).toHaveText(updatedSuiteName);
  });

  test('TC-0127 Mengedit item dalam Test Suite', async ({ page }) => {
    await page.goto(suiteUrl);
    await expect(page.locator('.layout-topbar')).toBeVisible();

    await openRowMenu(page, itemTitle);
    await clickMenuItem(page, 'Edit');
    await page.locator('#item-title').fill(updatedItemTitle);
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.p-datatable-tbody')).toContainText(updatedItemTitle);
  });

  test('TC-0128 Menghapus item dari Test Suite', async ({ page }) => {
    await page.goto(suiteUrl);
    await expect(page.locator('.layout-topbar')).toBeVisible();

    await openRowMenu(page, updatedItemTitle);
    await clickMenuItem(page, 'Delete');
    await confirmDelete(page);

    await expect(page.locator('.p-datatable-tbody')).not.toContainText(updatedItemTitle);
  });

  test('TC-0129 Mengubah visibility Test Suite menjadi public', async ({ page }) => {
    await page.goto(suiteUrl);
    await expect(page.locator('.layout-topbar')).toBeVisible();

    await page.locator('.header-actions button:has(.pi-pencil)').click();
    await page.locator('#suite-visibility').click();
    await page.locator('.p-dropdown-item:has-text("Public — visible to everyone")').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.p-card h2 + .p-tag')).toHaveText('Public');
  });

  test('TC-0130 Menghapus Test Suite beserta itemnya', async ({ page }) => {
    await page.goto('/app/test-suites');
    await expect(page.locator('.layout-topbar')).toBeVisible();

    const row = page.locator('.p-datatable-tbody tr', { hasText: updatedSuiteName });
    await expect(row).toHaveCount(1);

    await openRowMenu(page, updatedSuiteName, false);
    await clickMenuItem(page, 'Delete');
    await confirmDelete(page);

    await expect(page.locator('.p-datatable-tbody tr', { hasText: updatedSuiteName })).toHaveCount(0);
  });
});

async function openRowMenu(page: Page, rowText: string, waitForMenu = true) {
  const row = page.locator('.p-datatable-tbody tr', { hasText: rowText }).first();
  await expect(row).toBeVisible();
  await row.locator('.pi-ellipsis-v').click();
  if (waitForMenu) {
    await page.locator('.p-menu:visible').waitFor({ state: 'visible' });
  }
}

async function clickMenuItem(page: Page, label: string) {
  const item = page.locator('.p-menu:visible .p-menuitem:visible', { hasText: label }).first();
  await expect(item).toBeVisible();
  await item.click();
}

async function confirmDelete(page: Page) {
  const accept = page.locator('.p-confirm-dialog .p-confirm-dialog-accept:visible');
  await expect(accept).toBeVisible();
  await accept.click();
}
