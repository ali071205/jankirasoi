import { test, expect } from '@playwright/test';

test.describe('Food Management, Cloudinary Compression & Instant Website Reflection', () => {
  const ADMIN_BASE = 'http://localhost:3002';
  const WEB_BASE = 'http://localhost:3001';
  const API_BASE = 'http://localhost:3000/api/v1';

  const timestamp = Date.now();
  const testDishName = `Dum Biryani Special ${timestamp}`;
  const updatedDishName = `Royal Dum Biryani ${timestamp}`;

  test('1. Cloudinary upload signature generation & automatic compression verification', async ({ request }) => {
    // Check signature endpoint
    const sigRes = await request.get(`${API_BASE}/admin/uploads/signature?folder=jankirasoi/menu`, {
      headers: {
        'x-simulated-role': 'STAFF',
      },
    });
    expect(sigRes.status()).toBe(200);
    const sigData = await sigRes.json();
    expect(sigData).toHaveProperty('apiKey');
    expect(sigData).toHaveProperty('timestamp');
    expect(sigData).toHaveProperty('signature');
    expect(sigData).toHaveProperty('uploadUrl');
    expect(sigData.uploadUrl).toContain('api.cloudinary.com');

    // Test Cloudinary real upload using a 1x1 test PNG buffer
    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(dummyPngBase64, 'base64');

    const uploadRes = await request.post(sigData.uploadUrl, {
      multipart: {
        file: {
          name: 'test-dish.png',
          mimeType: 'image/png',
          buffer: imageBuffer,
        },
        api_key: sigData.apiKey,
        timestamp: String(sigData.timestamp),
        folder: sigData.folder,
        signature: sigData.signature,
      },
    });
    expect(uploadRes.status()).toBe(200);
    const uploadJson = await uploadRes.json();
    expect(uploadJson.secure_url).toBeDefined();

    // Verify Cloudinary URL automatic compression using f_auto,q_auto,w_1200,c_limit
    let optimizedUrl = uploadJson.secure_url;
    if (!optimizedUrl.includes('/f_auto')) {
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_limit/');
    }

    const cdnRes = await request.get(optimizedUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,*/*',
      },
    });
    expect(cdnRes.status()).toBe(200);
    const contentType = cdnRes.headers()['content-type'];
    expect(['image/webp', 'image/avif', 'image/png']).toContain(contentType);
  });

  test('2. Complete Lifecycle: Add Dish -> Instant Reflection -> 86 Sold Out Toggle -> Edit -> Delete', async ({ browser }) => {
    test.setTimeout(120000);
    const adminContext = await browser.newContext();
    const webContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const webPage = await webContext.newPage();

    // STEP A: Customer opens website menu page
    await webPage.goto(`${WEB_BASE}/menu`, { waitUntil: 'domcontentloaded' });
    await expect(webPage.locator('text=Homestyle Thalis').first()).toBeVisible({ timeout: 15000 });
    await expect(webPage.locator(`text=${testDishName}`)).not.toBeVisible();

    // STEP B: Admin navigates to Menu & Kitchen Dishes
    await adminPage.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });
    const menuBtn = adminPage.locator('[data-testid="admin-nav-menu-btn"]').first();
    await expect(menuBtn).toBeVisible({ timeout: 10000 });
    await menuBtn.click();
    await expect(adminPage.locator('text=Menu & Kitchen Dishes')).toBeVisible({ timeout: 10000 });
    // Wait for categories to load from backend (with reload fallback for cold start)
    try {
      await expect(adminPage.locator('text=Daily Tiffin Thalis').first()).toBeVisible({ timeout: 10000 });
    } catch {
      const reloadBtn = adminPage.locator('button').filter({ hasText: /reload/i }).first();
      if (await reloadBtn.isVisible()) await reloadBtn.click();
      await expect(adminPage.locator('text=Daily Tiffin Thalis').first()).toBeVisible({ timeout: 20000 });
    }

    // STEP C: Open Add New Food modal
    const addFoodBtn = adminPage.locator('button').filter({ hasText: /add new food/i }).first();
    await addFoodBtn.click();
    await expect(adminPage.locator('text=Add New Food Item')).toBeVisible();

    // STEP D: Fill details
    const nameInput = adminPage.locator('input[placeholder*="Shahi Paneer"]').first();
    await nameInput.fill(testDishName);

    const priceInput = adminPage.locator('input[type="number"]').first();
    await priceInput.fill('179');

    const descInput = adminPage.locator('textarea').first();
    await descInput.fill('Slow cooked fragrant basmati rice with fresh organic farm vegetables.');

    // Select preset
    const presetBtn = adminPage.locator('button').filter({ hasText: /deluxe/i }).first();
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
    }

    // Submit form
    const submitBtn = adminPage.locator('button[type="submit"]').filter({ hasText: /add food|publish/i }).first();
    await submitBtn.click();

    // Verify modal closes
    await expect(adminPage.locator('text=Add New Food Item')).not.toBeVisible({ timeout: 10000 });

    // Verify created in Admin dishes list
    await expect(adminPage.locator(`text=${testDishName}`).first()).toBeVisible({ timeout: 15000 });

    // STEP E: INSTANT REFLECTION on Customer Website
    await webPage.bringToFront();
    await webPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    // Verify the new dish appears on customer website
    await expect(webPage.locator(`text=${testDishName}`).first()).toBeVisible({ timeout: 15000 });
    await expect(webPage.locator(`text=₹179`).first()).toBeVisible({ timeout: 15000 });

    // STEP F: TOGGLE 86 / SOLD OUT in Admin
    await adminPage.bringToFront();
    // Find the dish card in Admin
    const adminDishCard = adminPage.locator('div.rounded-2xl').filter({ hasText: testDishName }).last();
    const stockToggle = adminDishCard.locator('button[role="switch"]').first();
    await stockToggle.click();
    await expect(adminDishCard.locator('text=86 / OFF').first()).toBeVisible({ timeout: 10000 });

    // STEP G: Verify SOLD OUT instantly reflects on Customer Website
    await webPage.bringToFront();
    await webPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(webPage.locator('text=Sold Out Today').first()).toBeVisible({ timeout: 15000 });

    // STEP H: EDIT DISH in Admin
    await adminPage.bringToFront();
    const editBtn = adminDishCard.locator('button').filter({ hasText: /edit/i }).first();
    await editBtn.click();
    await expect(adminPage.locator('text=Edit Food Item').first()).toBeVisible({ timeout: 5000 });

    const editNameInput = adminPage.locator('form input[type="text"]').first();
    await editNameInput.fill(updatedDishName);

    const editPriceInput = adminPage.locator('form input[type="number"]').first();
    await editPriceInput.fill('219');

    const saveEditBtn = adminPage.locator('button[type="submit"]').filter({ hasText: /update|save/i }).first();
    await saveEditBtn.click();

    // Verify modal closed
    await expect(adminPage.locator('text=Edit Food Item')).not.toBeVisible({ timeout: 10000 });

    // Verify updated in Admin
    await expect(adminPage.locator(`text=${updatedDishName}`).first()).toBeVisible({ timeout: 10000 });

    // STEP I: Verify updated dish name & price on Customer Website
    await webPage.bringToFront();
    await webPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(webPage.locator(`text=${updatedDishName}`).first()).toBeVisible({ timeout: 15000 });
    await expect(webPage.locator(`text=₹219`).first()).toBeVisible({ timeout: 15000 });

    // STEP J: DELETE DISH in Admin
    await adminPage.bringToFront();
    const updatedAdminCard = adminPage.locator('div.rounded-2xl').filter({ hasText: updatedDishName }).last();
    const deleteBtn = updatedAdminCard.locator('button[title*="Remove food"]').first();
    await deleteBtn.click();

    await expect(adminPage.locator('text=Remove "').first()).toBeVisible({ timeout: 5000 });
    const confirmDeleteBtn = adminPage.locator('button').filter({ hasText: /yes, remove/i }).first();
    await confirmDeleteBtn.click();

    await expect(adminPage.locator('text=Remove "')).not.toBeVisible({ timeout: 10000 });
    // Verify dish card is removed from Admin (use card selector to avoid matching toast notification)
    await expect(adminPage.locator('div.rounded-2xl').filter({ hasText: updatedDishName })).toHaveCount(0, { timeout: 10000 });

    // STEP K: Verify dish is gone from Customer Website
    await webPage.bringToFront();
    await webPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(webPage.locator(`text=${updatedDishName}`)).toHaveCount(0, { timeout: 15000 });

    await adminContext.close();
    await webContext.close();
  });
});
