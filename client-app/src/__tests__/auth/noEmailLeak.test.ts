import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: postMock,
      get: getMock,
    })),
  },
}));

import { startOtp, verifyOtp } from '@/api/auth';

describe('Auth contract enforcement', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it('should NOT allow email in payload', async () => {
    await expect(startOtp({ email: 'test@test.com' } as unknown as string)).rejects.toThrow();
  });

  it('should only send phone for OTP start', async () => {
    postMock.mockResolvedValue({ status: 200, data: { ok: true } });
    await startOtp('+15871234567');
    expect(postMock).toHaveBeenCalledTimes(1);
    const [, payload] = postMock.mock.calls[0];
    expect(JSON.stringify(payload)).not.toContain('email');
  });

  it('should only send phone + code for OTP verify', async () => {
    postMock.mockResolvedValue({ status: 200, data: { ok: true } });
    await verifyOtp('+15871234567', '123456');
    const [, payload] = postMock.mock.calls[0];
    expect(payload).toEqual({ phone: '+15871234567', code: '123456' });
    expect(JSON.stringify(payload)).not.toContain('email');
  });
});
