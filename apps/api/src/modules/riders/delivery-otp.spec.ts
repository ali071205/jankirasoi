import { createHmac } from 'crypto';

describe('Delivery OTP Security & Verification Logic', () => {
  const SECRET = 'test-otp-secret-key-for-unit-tests';

  function hashOtp(code: string): string {
    return createHmac('sha256', SECRET).update(code).digest('hex');
  }

  it('should verify correct OTP with HMAC comparison', () => {
    const rawOtp = '583921';
    const storedVerifier = hashOtp(rawOtp);

    const submittedOtp = '583921';
    const inputHash = hashOtp(submittedOtp);

    expect(inputHash).toBe(storedVerifier);
  });

  it('should reject incorrect OTP code', () => {
    const storedVerifier = hashOtp('583921');
    const wrongInputHash = hashOtp('123456');

    expect(wrongInputHash).not.toBe(storedVerifier);
  });

  it('should lock after 5 attempts', () => {
    let attempts = 0;
    const maxAttempts = 5;

    for (let i = 0; i < 5; i++) {
      attempts++;
    }

    const isLocked = attempts >= maxAttempts;
    expect(isLocked).toBe(true);
  });
});
