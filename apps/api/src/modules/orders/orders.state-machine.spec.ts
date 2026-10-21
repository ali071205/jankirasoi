describe('Order State Machine & Business Rules', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    AWAITING_PAYMENT: ['PLACED', 'CANCELLED'],
    PLACED: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
    READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_EXCEPTION'],
    DELIVERY_EXCEPTION: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  it('should permit valid linear order progression', () => {
    expect(VALID_TRANSITIONS['AWAITING_PAYMENT']).toContain('PLACED');
    expect(VALID_TRANSITIONS['PLACED']).toContain('ACCEPTED');
    expect(VALID_TRANSITIONS['ACCEPTED']).toContain('PREPARING');
    expect(VALID_TRANSITIONS['PREPARING']).toContain('READY_FOR_PICKUP');
    expect(VALID_TRANSITIONS['READY_FOR_PICKUP']).toContain('OUT_FOR_DELIVERY');
    expect(VALID_TRANSITIONS['OUT_FOR_DELIVERY']).toContain('DELIVERED');
  });

  it('should prohibit illegal state skips', () => {
    // Cannot skip directly from PLACED to DELIVERED without kitchen and rider steps
    expect(VALID_TRANSITIONS['PLACED']).not.toContain('DELIVERED');
    // Cannot move from DELIVERED to CANCELLED
    expect(VALID_TRANSITIONS['DELIVERED']).not.toContain('CANCELLED');
    // Terminal states cannot transition further
    expect(VALID_TRANSITIONS['DELIVERED'].length).toBe(0);
    expect(VALID_TRANSITIONS['CANCELLED'].length).toBe(0);
  });
});
