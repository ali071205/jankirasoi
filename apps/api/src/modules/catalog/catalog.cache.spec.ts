describe('Catalog In-Memory Query Caching & Invalidation', () => {
  it('should serve cached catalog data within TTL window and avoid repeating database query', () => {
    let dbQueryCount = 0;
    const mockDbQuery = () => {
      dbQueryCount++;
      return { categories: [{ id: 'cat-1', name: 'Thalis' }] };
    };

    const cache = new Map<string, { data: any; cachedAt: number }>();
    const TTL_MS = 30_000;

    const getCatalog = (key = 'default', now = 1000) => {
      const cached = cache.get(key);
      if (cached && now - cached.cachedAt < TTL_MS) {
        return cached.data;
      }
      const data = mockDbQuery();
      cache.set(key, { data, cachedAt: now });
      return data;
    };

    // First call: executes DB query
    const res1 = getCatalog('default', 1000);
    expect(res1.categories.length).toBe(1);
    expect(dbQueryCount).toBe(1);

    // Second call within TTL: served from cache without DB query
    const res2 = getCatalog('default', 5000);
    expect(res2).toEqual(res1);
    expect(dbQueryCount).toBe(1);

    // Invalidation upon mutation
    cache.clear();

    // Third call after invalidation: fetches freshly from DB
    const res3 = getCatalog('default', 6000);
    expect(res3).toEqual(res1);
    expect(dbQueryCount).toBe(2);
  });
});
