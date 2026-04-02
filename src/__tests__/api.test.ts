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
      json: async () => ({ status: 'ok', data: { value: 123 } }),
    } as Response);

    const { api } = await import('../lib/api');
    const result = await api<{ value: number }>('/test');

    expect(result).toEqual({ value: 123 });
  });

  it('throws when response indicates an error', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ status: 'error', error: 'boom' }),
    } as Response);

    const { api } = await import('../lib/api');

    await expect(api('/test')).rejects.toThrow('boom');
  });

  it('locks contract calls onto env API base', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.resetModules();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', data: { id: 'lead_1' } }),
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
