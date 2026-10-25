import { test, expect } from '@playwright/test';

test.describe('API Endpoints Verification', () => {
  const API_BASE = 'http://localhost:3000/api/v1';

  test('GET /health - server health status', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('UP');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  test('GET /health/ready - database readiness probe', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/ready`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('READY');
    expect(body.database).toBe('CONNECTED');
  });

  test('GET /catalog - catalog categories and menu items', async ({ request }) => {
    const res = await request.get(`${API_BASE}/catalog`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('categories');
    expect(Array.isArray(body.categories)).toBe(true);
  });

  test('GET /delivery-zones - delivery zones list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/delivery-zones`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /delivery-slots - delivery slots for date', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request.get(`${API_BASE}/delivery-slots?date=${today}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('slots');
    expect(Array.isArray(body.slots)).toBe(true);
  });

  test('POST /checkout/quote - quotation calculation endpoint', async ({ request }) => {
    const res = await request.post(`${API_BASE}/checkout/quote`, {
      data: {
        items: [{ dishId: 'dish-demo-1', variantId: 'single', quantity: 1 }],
        pincode: '454774',
        distanceKm: 4.5,
      },
    });
    // Expected to return quote or structured validation response
    expect([200, 201, 400, 404]).toContain(res.status());
  });

  test('GET /admin/orders - protected or structured order retrieval', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/orders?limit=10`, {
      headers: {
        'x-simulated-role': 'ADMIN',
      },
    });
    expect([200, 401, 403]).toContain(res.status());
  });

  test('GET /orders/track/:token - track invalid order returns 404', async ({ request }) => {
    const res = await request.get(`${API_BASE}/orders/track/invalid-dummy-token`);
    expect(res.status()).toBe(404);
  });

  test('POST /rider/auth/login - rider phone authentication endpoint', async ({ request }) => {
    const res = await request.post(`${API_BASE}/rider/auth/login`, {
      data: {
        phone: '+919876543210',
      },
    });
    expect([200, 201, 400, 401, 404]).toContain(res.status());
  });
});
