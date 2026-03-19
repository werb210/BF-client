import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendOtp, verifyOtp } from '@/api/auth';

describe('Auth contract enforcement', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('should NOT allow email in payload', async () => {
    await expect(sendOtp({ email: 'test@test.com' } as unknown as string)).rejects.toThrow();
  });

  it('should only send phone for OTP start', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await sendOtp('+15871234567');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.stringify(requestInit)).not.toContain('email');
    expect(JSON.parse(String(requestInit?.body))).toEqual({ phone: '+15871234567' });
  });

  it('should only send phone + code for OTP verify', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await verifyOtp('+15871234567', '123456');

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(requestInit?.body))).toEqual({ phone: '+15871234567', code: '123456' });
    expect(JSON.stringify(requestInit)).not.toContain('email');
  });
});
