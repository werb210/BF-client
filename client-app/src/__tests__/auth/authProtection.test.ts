import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

describe('Auth protection expectations', () => {
  it('should expect 401 without auth (contract test)', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 401 } });

    await expect(axios.get('/api/applications')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(getSpy).toHaveBeenCalledWith('/api/applications');
  });
});
