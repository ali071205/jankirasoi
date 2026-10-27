import { test, expect } from '@playwright/test';

test.describe('Rider Web App, In-App Route Maps & Location System', () => {
  const WEB_BASE = 'http://localhost:3001';

  test('1. Rider portal login, active deliveries, and in-app route map modal', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${WEB_BASE}/rider`, { waitUntil: 'domcontentloaded' });

    // Step 1: Fill credentials
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill('9811223344');
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.fill('RiderPassword123!');

    const startShiftBtn = page.locator('button[type="submit"]').filter({ hasText: /start delivery shift/i }).first();
    await startShiftBtn.click();

    // Step 2: Verify Rider Dashboard loads
    await expect(page.locator('text=Janki Rasoi Rider')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=ON DUTY')).toBeVisible({ timeout: 20000 });

    // Step 3: Verify Deliveries appear with drop location and distance
    await expect(page.locator('text=Active Trips')).toBeVisible({ timeout: 20000 });
    const mapRouteBtn = page.locator('button').filter({ hasText: /Map & Route/i }).first();
    await expect(mapRouteBtn).toBeVisible({ timeout: 25000 });

    // Step 4: Open In-App Route & Map modal
    await mapRouteBtn.click();
    await expect(page.locator('text=Delivery Route & Map')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Janki Rasoi Cloud Kitchen')).toBeVisible();
    await expect(page.locator('text=Main Bazar, Sagore, Pithampur')).toBeVisible();

    // Step 5: Verify Google Maps turn-by-turn navigation button is present
    const navBtn = page.locator('a').filter({ hasText: /Start Turn-by-Turn GPS/i }).first();
    await expect(navBtn).toBeVisible();
    const navHref = await navBtn.getAttribute('href');
    expect(navHref).toBeTruthy();
    // Verify destination points to Sagore / Pithampur and NOT New Delhi (28.52728)
    expect(navHref).not.toContain('28.52728');
    expect(navHref?.toLowerCase()).toMatch(/sagore|pithampur|75\./);

    // Step 6: Verify Copy Address button triggers toast
    const copyBtn = page.locator('div.fixed').locator('button').filter({ hasText: /Copy Address/i }).first();
    await copyBtn.click();
    await expect(page.locator('text=Address copied!')).toBeVisible({ timeout: 5000 });

    // Step 7: Close modal
    const closeBtn = page.locator('div.fixed button:has-text("close")').last();
    await closeBtn.click();
    await expect(page.locator('text=Delivery Route & Map')).not.toBeVisible({ timeout: 5000 });
  });

  test('2. Customer delivery location persistence in Header & Cart without repeat prompts', async ({ page }) => {
    test.setTimeout(60000);
    // Step 1: Open Storefront
    await page.goto(`${WEB_BASE}`, { waitUntil: 'domcontentloaded' });
    const locationPill = page.locator('header button').filter({ hasText: /deliver to/i }).first();
    await expect(locationPill).toBeVisible({ timeout: 15000 });

    // Step 2: Open Location Selector
    await locationPill.click();
    await expect(page.locator('text=Select Your Location')).toBeVisible({ timeout: 5000 });

    // Step 3: Switch to Map Pinpoint view via "Add New Address" card
    const addAddressCard = page.locator('div.fixed button').filter({ hasText: /Add New/i }).first();
    await addAddressCard.click();

    // Modal switches to Pinpoint view
    await expect(page.locator('text=Sagore Kitchen')).toBeVisible({ timeout: 8000 });
    const confirmBtn = page.locator('div.fixed button').filter({ hasText: /confirm/i }).first();
    await confirmBtn.click();

    // Verify modal closes
    await expect(page.locator('text=Select Your Location')).not.toBeVisible({ timeout: 5000 });

    // Step 4: Verify Header updated and reflects Sagore area
    await expect(page.locator('header button').filter({ hasText: /deliver to/i })).toContainText(/Sagore|Market/i);

    // Step 5: Reload page and ensure selected address persists!
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('header button').filter({ hasText: /deliver to/i })).toContainText(/Sagore|Market/i);

    // Step 6: Navigate to Cart — ensure location modal does NOT pop up unprompted!
    await page.goto(`${WEB_BASE}/cart`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Your Cart is Empty').or(page.locator('text=Delivery Tray'))).toBeVisible({ timeout: 15000 });
    // Location modal should NOT be open
    await expect(page.locator('text=Select Your Location')).not.toBeVisible();
  });
});
