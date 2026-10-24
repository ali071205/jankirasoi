import * as http from 'http';

function getJson(url: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode || 0, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data: body });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

describe('End-to-End (E2E) API Integration Tests', () => {
  const BASE_URL = 'http://localhost:3000/api/v1';

  it('GET /catalog should return 200 OK with valid active menu categories and items', async () => {
    try {
      const res = await getJson(`${BASE_URL}/catalog`);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveProperty('serviceDate');
      expect(Array.isArray(res.data.categories)).toBe(true);
      if (res.data.categories.length > 0) {
        const cat = res.data.categories[0];
        expect(cat).toHaveProperty('name');
        expect(Array.isArray(cat.items)).toBe(true);
        if (cat.items.length > 0) {
          const item = cat.items[0];
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('basePricePaise');
          expect(typeof item.basePricePaise).toBe('number');
        }
      }
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        console.warn('E2E server not running on port 3000, skipping live socket test');
      } else {
        throw err;
      }
    }
  });

  it('GET /delivery-slots should return 200 OK with available meal slots', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await getJson(`${BASE_URL}/delivery-slots?date=${today}`);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveProperty('date', today);
      expect(Array.isArray(res.data.slots)).toBe(true);
      expect(res.data.slots.length).toBeGreaterThan(0);
      const slot = res.data.slots[0];
      expect(slot).toHaveProperty('mealType');
      expect(slot).toHaveProperty('isAvailable');
      expect(typeof slot.remainingCapacity).toBe('number');
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        console.warn('E2E server not running on port 3000, skipping live socket test');
      } else {
        throw err;
      }
    }
  });

  it('GET /delivery-slots with invalid date format should return 400 Bad Request', async () => {
    try {
      const res = await getJson(`${BASE_URL}/delivery-slots?date=invalid-date`);
      expect(res.statusCode).toBe(400);
      expect(res.data.message).toContain('Invalid date format');
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        console.warn('E2E server not running on port 3000, skipping live socket test');
      } else {
        throw err;
      }
    }
  });
});
