import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendOtp, verifyOtpCode } from '@/api/auth';

describe('Auth contract enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should NOT allow email in payload', async () => {
    await expect(sendOtp({ email: 'test@test.com' } as unknown as string)).rejects.toThrow();
  });

  it('should only send phone for OTP start', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await sendOtp('+15871234567');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/auth/send-otp');
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({ phone: '+15871234567' });
    expect(JSON.stringify((options as RequestInit).body)).not.toContain('email');
  });

  it('should only send phone + code for OTP verify', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'token-123' }),
    } as Response);

    await verifyOtpCode('+15871234567', '123456');

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/auth/verify-otp');
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({ phone: '+15871234567', code: '123456' });
    expect(JSON.stringify((options as RequestInit).body)).not.toContain('email');
  });
});
