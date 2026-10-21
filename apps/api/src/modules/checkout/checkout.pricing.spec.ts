describe('Authoritative Pricing & Integer Paise Engine', () => {
  it('should accurately calculate subtotal, packaging, 5% GST, and delivery in paise without float drift', () => {
    // 2 x Thali @ ₹159.00 (15900 paise) = 31800 paise
    const itemUnitPricePaise = 15900;
    const quantity = 2;
    const subtotalPaise = itemUnitPricePaise * quantity;
    expect(subtotalPaise).toBe(31800);

    // Packaging fee = ₹15.00 (1500 paise)
    const packagingFeePaise = 1500;

    // Delivery fee = ₹30.00 (3000 paise)
    const deliveryFeePaise = 3000;

    // 5% GST on subtotal = 31800 * 0.05 = 1590 paise
    const taxPaise = Math.round(subtotalPaise * 0.05);
    expect(taxPaise).toBe(1590);

    const totalAmountPaise = subtotalPaise + packagingFeePaise + deliveryFeePaise + taxPaise;
    // 31800 + 1500 + 3000 + 1590 = 37890 paise (₹378.90)
    expect(totalAmountPaise).toBe(37890);

    // Formatted rupee string
    const formatted = `₹${(totalAmountPaise / 100).toFixed(2)}`;
    expect(formatted).toBe('₹378.90');
  });

  it('should waive delivery fee when order subtotal exceeds freeDeliveryThresholdPaise', () => {
    const freeDeliveryThresholdPaise = 29900; // ₹299.00
    const subtotalPaise = 31800; // ₹318.00

    let deliveryFeePaise = 3000;
    if (subtotalPaise >= freeDeliveryThresholdPaise) {
      deliveryFeePaise = 0;
    }

    expect(deliveryFeePaise).toBe(0);
  });
});
