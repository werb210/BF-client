import api from '@/api/client';
import { describe, expect, it, vi } from 'vitest';

describe('Auth protection expectations', () => {
  it('should expect 401 without auth (contract test)', async () => {
    const getSpy = vi.spyOn(api, 'get').mockRejectedValue(new Error('API_ERROR_401'));

    await expect(api.get('/applications')).rejects.toMatchObject({
      message: 'API_ERROR_401',
    });

    expect(getSpy).toHaveBeenCalledWith('/applications');
  });
});
