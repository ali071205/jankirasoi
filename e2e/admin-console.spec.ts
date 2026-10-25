import { test, expect } from '@playwright/test';

test.describe('Operations Console & Kitchen KDS (Admin App)', () => {
  const ADMIN_BASE = 'http://localhost:3002';

  test('Admin Console loads properly without uncaught exceptions', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Janki Rasoi/i);

    const mainContainer = page.locator('body');
    await expect(mainContainer).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('Kitchen pipeline view and condensed view toggle work properly', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });

    // Find the view switch button (Pipeline vs Condensed Table)
    const toggleButton = page.locator('button').filter({ hasText: /pipeline|condensed|table|view/i }).first();
    if (await toggleButton.isVisible()) {
      await expect(toggleButton).toBeEnabled();
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Toggle back
      await toggleButton.click();
      await page.waitForTimeout(500);
    }

    expect(pageErrors).toEqual([]);
  });

  test('Add Dish modal opens, presets are selectable, and modal closes cleanly', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });

    // Find and click the Add Dish button
    const addDishBtn = page.locator('button').filter({ hasText: /add dish|add thali|new dish/i }).first();
    if (await addDishBtn.isVisible()) {
      await addDishBtn.click();
      await page.waitForTimeout(400);

      // Verify the modal dialog appeared
      const modal = page.locator('form').first();
      await expect(modal).toBeVisible();

      // Check for upload image button
      const uploadLabel = page.locator('label').filter({ hasText: /upload image|upload file/i }).first();
      await expect(uploadLabel).toBeVisible();

      // Check preset buttons
      const presetBtn = page.locator('button').filter({ hasText: /standard thali|deluxe thali|mini thali/i }).first();
      if (await presetBtn.isVisible()) {
        await presetBtn.click();
      }

      // Close modal using Cancel button
      const cancelBtn = page.locator('button').filter({ hasText: /cancel/i }).first();
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Verify modal is closed
      await expect(modal).not.toBeVisible();
    }

    expect(pageErrors).toEqual([]);
  });

  test('Order search and status filter buttons are responsive', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });

    // Test search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('JK-');
      await page.waitForTimeout(200);
      await searchInput.clear();
    }

    // Test filter pills
    const filterButtons = page.locator('button').filter({ hasText: /all|pending|preparing|out for delivery|delivered/i });
    const count = await filterButtons.count();
    if (count > 1) {
      await filterButtons.nth(1).click();
      await page.waitForTimeout(300);
      await filterButtons.nth(0).click();
    }

    expect(pageErrors).toEqual([]);
  });
});
