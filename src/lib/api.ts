import { apiClient } from './apiClient';

export const api = {
  get: <T>(path: string) => apiClient<T>(path),

  post: <T>(path: string, body: unknown) =>
    apiClient<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    apiClient<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
