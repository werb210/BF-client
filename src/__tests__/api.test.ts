import { afterEach, describe, expect, it, vi } from 'vitest';

describe('api', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns response data on successful request', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: 123 }),
    } as Response);

    const { api } = await import('../lib/api');
    const data = await api<{ value: number }>('/maya/chat', { method: 'POST' });

    expect(data).toEqual({ value: 123 });
  });

  it('throws when response is not ok', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'boom' } }),
    } as Response);

    const { api } = await import('../lib/api');

    await expect(api('/maya/chat', { method: 'POST' })).rejects.toThrow('API request failed');
  });

  it('blocks direct /api-prefixed paths to prevent contract drift', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();
    const { apiRequest } = await import('../lib/api');

    await expect(apiRequest('/api/leads')).rejects.toThrow('DIRECT_API_PATH_FORBIDDEN');
  });

  it('locks contract calls onto env API base', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'lead_1' }),
    } as Response);

    const { createLead } = await import('../api/leads');

    await createLead({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-555-0100',
      source: 'test',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/leads',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
