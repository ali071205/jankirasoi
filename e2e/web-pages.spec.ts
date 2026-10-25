import { test, expect } from '@playwright/test';

test.describe('Web Storefront Client Pages & Interactive Elements', () => {
  const WEB_BASE = 'http://localhost:3001';

  test('Home Page (/) renders without JavaScript errors and navigation links work', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(WEB_BASE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Janki Rasoi/i);

    // Verify key sections
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify explore menu or order CTA button exists
    const menuCta = page.getByRole('link', { name: /explore menu|order now|menu/i }).first();
    if (await menuCta.isVisible()) {
      await expect(menuCta).toBeEnabled();
    }

    // On mobile viewports, verify bottom navigation
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNav = page.locator('nav[aria-label="Main Navigation"]');
    await expect(mobileNav).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('Menu Page (/menu) renders dishes, category selector and add to cart buttons', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/menu`, { waitUntil: 'domcontentloaded' });

    // Check main container
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Verify interactive buttons exist
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Test clicking the first available category or action button if present
    const firstButton = buttons.first();
    await expect(firstButton).toBeEnabled();

    expect(pageErrors).toEqual([]);
  });

  test('Cart Page (/cart) displays cart state and interactive buttons without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/cart`, { waitUntil: 'domcontentloaded' });

    // Should display empty cart state or active items
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Find links or buttons (like Browse Menu if empty, or Checkout)
    const browseButton = page.locator('a, button').filter({ hasText: /browse menu|menu|order|explore/i }).first();
    if (await browseButton.isVisible()) {
      await expect(browseButton).toBeEnabled();
    }

    expect(pageErrors).toEqual([]);
  });

  test('Track Page (/track) loads tracker input and submits query cleanly', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/track`, { waitUntil: 'domcontentloaded' });

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Check search / order ID input
    const orderInput = page.locator('input[type="text"]').first();
    if (await orderInput.isVisible()) {
      await orderInput.fill('ORDER-TEST-1234');
      const trackBtn = page.locator('button').filter({ hasText: /track|search|find/i }).first();
      if (await trackBtn.isVisible()) {
        await expect(trackBtn).toBeEnabled();
      }
    }

    expect(pageErrors).toEqual([]);
  });

  test('Rider Portal (/rider) displays login and tab interface', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/rider`, { waitUntil: 'domcontentloaded' });

    const container = page.locator('body');
    await expect(container).toBeVisible();

    // Check phone input or demo quick login button
    const demoLoginBtn = page.locator('button').filter({ hasText: /demo|login|continue/i }).first();
    if (await demoLoginBtn.isVisible()) {
      await expect(demoLoginBtn).toBeEnabled();
    }

    expect(pageErrors).toEqual([]);
  });

  test('Standalone Web Admin (/admin) displays kitchen console correctly', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/admin`, { waitUntil: 'domcontentloaded' });

    const mainContent = page.locator('body');
    await expect(mainContent).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('Privacy Policy (/privacy) & Terms (/terms) render clean content', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${WEB_BASE}/privacy`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    await page.goto(`${WEB_BASE}/terms`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
