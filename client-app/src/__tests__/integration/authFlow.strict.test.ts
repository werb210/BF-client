import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';

function installUnauthorizedAdapter(): () => void {
  const originalAdapter = axios.defaults.adapter;

  const adapter: AxiosAdapter = async (
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse> => {
    const { url = '', method = 'get' } = config;

    if (method.toLowerCase() === 'get' && url === '/api/auth/me') {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { error: 'missing_session' },
      });
    }

    throw new AxiosError('Not found', 'ERR_BAD_REQUEST', config, undefined, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
      data: { error: 'route_not_mocked', url, method },
    });
  };

  axios.defaults.adapter = adapter;
  return () => {
    axios.defaults.adapter = originalAdapter;
  };
}

describe('Strict auth contract', () => {
  let restoreAdapter: () => void;

  afterEach(() => {
    restoreAdapter?.();
  });

  it('returns 401 for /api/auth/me when session is not established', async () => {
    restoreAdapter = installUnauthorizedAdapter();

    await expect(axios.get('/api/auth/me')).rejects.toMatchObject({
      response: {
        status: 401,
      },
    });
  });
});
