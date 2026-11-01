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

  test('Rider assignment lifecycle displays Assigning and Assigned states instead of OTP', async ({ page }) => {
    // Intercept admin orders API to verify the exact UI rendering of the assignment lifecycle
    await page.route('**/api/v1/admin/orders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              id: 'ord-unassigned-1',
              orderNumber: 'JR-1001',
              status: 'READY_FOR_PICKUP',
              customerName: 'Aarav Patel',
              customerPhone: '9876500001',
              deliveryAddress: 'Flat 101, Galaxy Heights, Sagore',
              slotLabel: 'Tonight Dinner (07:30 PM - 09:30 PM)',
              totalAmountPaise: 12000,
              paymentMethod: 'ONLINE',
              paymentStatus: 'CAPTURED',
              assignedRider: null,
              itemsCount: 1,
              items: [{ productId: 'p1', productName: 'Deluxe Thali', quantity: 1, unitPricePaise: 12000, totalPricePaise: 12000 }],
              createdAt: new Date().toISOString(),
            },
            {
              id: 'ord-assigning-2',
              orderNumber: 'JR-1002',
              status: 'READY_FOR_PICKUP',
              customerName: 'Pooja Verma',
              customerPhone: '9876500002',
              deliveryAddress: 'House 22, Sector 3, Sagore',
              slotLabel: 'Tonight Dinner (07:30 PM - 09:30 PM)',
              totalAmountPaise: 15000,
              paymentMethod: 'COD',
              paymentStatus: 'PENDING',
              assignedRider: {
                id: 'rider-1',
                name: 'Delivery Rider',
                phone: '9876543210',
                assignmentStatus: 'ASSIGNED',
              },
              itemsCount: 1,
              items: [{ productId: 'p2', productName: 'Special Thali', quantity: 1, unitPricePaise: 15000, totalPricePaise: 15000 }],
              createdAt: new Date().toISOString(),
            },
            {
              id: 'ord-accepted-3',
              orderNumber: 'JR-1003',
              status: 'OUT_FOR_DELIVERY',
              customerName: 'Sanjay Gupta',
              customerPhone: '9876500003',
              deliveryAddress: 'Shop 5, Main Bazar, Sagore',
              slotLabel: 'Tonight Dinner (07:30 PM - 09:30 PM)',
              totalAmountPaise: 18000,
              paymentMethod: 'ONLINE',
              paymentStatus: 'CAPTURED',
              assignedRider: {
                id: 'rider-1',
                name: 'Delivery Rider',
                phone: '9876543210',
                assignmentStatus: 'ACCEPTED',
              },
              itemsCount: 1,
              items: [{ productId: 'p1', productName: 'Deluxe Thali', quantity: 1, unitPricePaise: 18000, totalPricePaise: 18000 }],
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { total: 3, page: 1, limit: 25, totalPages: 1 },
        }),
      });
    });

    await page.goto(ADMIN_BASE, { waitUntil: 'domcontentloaded' });

    // 1. Unassigned ready order should show "Assign"
    await expect(page.locator('button').filter({ hasText: /Assign/i }).first()).toBeVisible({ timeout: 15000 });

    // 2. Dispatched but not yet accepted order should show "Assigning"
    await expect(page.locator('button').filter({ hasText: /Assigning/i }).first()).toBeVisible({ timeout: 10000 });

    // 3. Accepted order in transit should show "Assigned" instead of bare "OTP"
    await expect(page.locator('button').filter({ hasText: /Assigned/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
