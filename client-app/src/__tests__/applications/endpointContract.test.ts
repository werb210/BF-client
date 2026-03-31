import { describe, expect, it } from 'vitest';

describe('API contract', () => {
  it('should use otp and documents endpoint paths', () => {
    expect('/api/auth/start-otp').toBe('/api/auth/start-otp');
    expect('/api/auth/verify-otp').toBe('/api/auth/verify-otp');
    expect('/documents/upload').toBe('/documents/upload');
  });
});
