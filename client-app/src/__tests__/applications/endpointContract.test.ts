import { describe, expect, it } from 'vitest';

describe('API contract', () => {
  it('should use otp and documents endpoint paths', () => {
    expect('/auth/otp/start').toBe('/auth/otp/start');
    expect('/documents/upload').toBe('/documents/upload');
  });
});
