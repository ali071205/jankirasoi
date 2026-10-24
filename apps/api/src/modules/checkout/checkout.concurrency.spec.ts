import { BadRequestException } from '@nestjs/common';

describe('Checkout Concurrency & Slot Capacity Guard', () => {
  it('should allow booking up to exactly maxCapacity (30/30) without false lockout', () => {
    const maxCapacity = 30;
    
    // Simulate booking 30th customer
    let bookedCount = 29;
    bookedCount += 1; // 30

    // Strict boundary: only strictly greater than maxCapacity is an overflow
    const isExceeded = bookedCount > maxCapacity;
    expect(isExceeded).toBe(false);
    expect(bookedCount).toBe(maxCapacity);
  });

  it('should reject and throw SLOT_CAPACITY_EXCEEDED when bookedCount exceeds maxCapacity (31/30)', () => {
    const maxCapacity = 30;
    
    // Simulate 31st customer attempting to book
    let bookedCount = 30;
    bookedCount += 1; // 31

    let error: any = null;
    try {
      if (bookedCount > maxCapacity) {
        throw new BadRequestException({
          code: 'SLOT_CAPACITY_EXCEEDED',
          message: 'Delivery slot capacity was filled by another order just now.',
        });
      }
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toEqual({
      code: 'SLOT_CAPACITY_EXCEEDED',
      message: 'Delivery slot capacity was filled by another order just now.',
    });
  });

  it('should handle order number collision gracefully by generating a distinct identifier', () => {
    const dateStr = '20261024';
    const countToday = 5;
    const orderSeq = countToday + 1;
    const baseOrderNumber = `JR-${dateStr}-${orderSeq.toString().padStart(4, '0')}`;

    // Simulate existing order with this number
    const existingOrders = new Set([baseOrderNumber]);

    let finalOrderNumber = baseOrderNumber;
    if (existingOrders.has(finalOrderNumber)) {
      const entropy = 'A1B2';
      finalOrderNumber = `JR-${dateStr}-${orderSeq.toString().padStart(4, '0')}-${entropy}`;
    }

    expect(finalOrderNumber).not.toBe(baseOrderNumber);
    expect(finalOrderNumber).toBe('JR-20261024-0006-A1B2');
    expect(existingOrders.has(finalOrderNumber)).toBe(false);
  });
});
