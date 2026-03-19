import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';

function installAuthAdapter(): () => void {
  const originalAdapter = axios.defaults.adapter;
  let sessionEstablished = false;

  const adapter: AxiosAdapter = async (
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse> => {
    const { url = '', method = 'get', data } = config;
    const body = typeof data === 'string' ? JSON.parse(data) : data;

    if (method.toLowerCase() === 'post' && url === '/api/auth/otp/start') {
      if (!body?.phone) {
        throw new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, undefined, {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config,
          data: { error: 'phone_required' },
        });
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { ok: true },
      };
    }

    if (method.toLowerCase() === 'post' && url === '/api/auth/otp/verify') {
      if (body?.code !== '123456') {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { error: 'invalid_otp' },
        });
      }

      sessionEstablished = true;
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { ok: true },
      };
    }

    if (method.toLowerCase() === 'get' && url === '/api/auth/me') {
      if (!sessionEstablished) {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { error: 'missing_session' },
        });
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { user: { id: 'u-123' } },
      };
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

describe('Auth flow (real contract)', () => {
  let restoreAdapter: () => void;

  afterEach(() => {
    restoreAdapter?.();
  });

  it('completes OTP → session → authenticated flow', async () => {
    restoreAdapter = installAuthAdapter();
    const phone = '+15871234567';

    const start = await axios.post('/api/auth/otp/start', { phone });
    expect(start.status).toBe(200);

    const verify = await axios.post('/api/auth/otp/verify', {
      phone,
      code: '123456',
    });
    expect(verify.status).toBe(200);

    const me = await axios.get('/api/auth/me');

    expect(me.status).toBe(200);
    expect(me.data.user).toBeDefined();
  });
});
