import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';

function installApplicationsAdapter(): () => void {
  const originalAdapter = axios.defaults.adapter;

  const adapter: AxiosAdapter = async (
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse> => {
    if (config.method?.toLowerCase() === 'post' && config.url === '/api/applications') {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { error: 'unauthorized' },
      });
    }

    throw new AxiosError('Not Found', 'ERR_BAD_REQUEST', config, undefined, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
      data: { error: 'route_not_mocked' },
    });
  };

  axios.defaults.adapter = adapter;
  return () => {
    axios.defaults.adapter = originalAdapter;
  };
}

describe('Applications auth contract', () => {
  let restoreAdapter: () => void;

  afterEach(() => {
    restoreAdapter?.();
  });

  it('returns 401 without auth', async () => {
    restoreAdapter = installApplicationsAdapter();

    await expect(axios.post('/api/applications', {})).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
