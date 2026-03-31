import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as apiModule from '@/lib/api';
import { sendOtp, verifyOtpCode } from '@/api/auth';

describe('Auth contract enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should NOT allow email in payload', async () => {
    await expect(sendOtp({ email: 'test@test.com' } as unknown as string)).rejects.toThrow();
  });

  it('should only send phone for OTP start', async () => {
    const requestSpy = vi.spyOn(apiModule, 'apiRequest').mockResolvedValue({ ok: true } as any);

    await sendOtp('+15871234567');

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const [url, options] = requestSpy.mock.calls[0];
    expect(url).toBe('/api/auth/start-otp');
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({ phone: '+15871234567' });
    expect(JSON.stringify((options as RequestInit).body)).not.toContain('email');
  });

  it('should only send phone + code for OTP verify', async () => {
    const requestSpy = vi.spyOn(apiModule, 'apiRequest').mockResolvedValue({ token: 'token-123' } as any);

    await verifyOtpCode('+15871234567', '123456');

    const [url, options] = requestSpy.mock.calls[0];
    expect(url).toBe('/api/auth/verify-otp');
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({ phone: '+15871234567', code: '123456' });
    expect(JSON.stringify((options as RequestInit).body)).not.toContain('email');
  });
});
