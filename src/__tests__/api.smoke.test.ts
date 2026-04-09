import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('api smoke', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    } as Response);
  });

  it('GET /health calls the correct endpoint', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://server.boreal.financial');
    const { api } = await import('../lib/api');
    const result = await api('/health');
    expect(result).toBeDefined();
  });
});
