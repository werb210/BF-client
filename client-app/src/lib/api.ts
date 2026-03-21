// src/lib/api.ts

import { runtimeConfig } from '../config/runtimeConfig';

function assertApiBase() {
  if (!runtimeConfig.API_BASE) {
    throw new Error('API base URL is not configured');
  }
}

export function buildUrl(path: string): string {
  assertApiBase();

  if (!path.startsWith('/')) {
    throw new Error(`Invalid API path: ${path}`);
  }

  return `${runtimeConfig.API_BASE}${path}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = buildUrl(path);

  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}
