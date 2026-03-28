import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '@/lib/api';
import { sendOtp, verifyOtpCode } from '@/api/auth';

describe('Auth contract enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should NOT allow email in payload', async () => {
    await expect(sendOtp({ email: 'test@test.com' } as unknown as string)).rejects.toThrow();
  });

  it('should only send phone for OTP start', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } } as any);

    await sendOtp('+15871234567');

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, body] = postSpy.mock.calls[0];
    expect(url).toBe('/api/auth/otp/start');
    expect(body).toEqual({ phone: '+15871234567' });
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('should only send phone + code for OTP verify', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { token: 'token-123' } } as any);

    await verifyOtpCode('+15871234567', '123456');

    const [url, body] = postSpy.mock.calls[0];
    expect(url).toBe('/api/auth/otp/verify');
    expect(body).toEqual({ phone: '+15871234567', code: '123456' });
    expect(JSON.stringify(body)).not.toContain('email');
  });
});
