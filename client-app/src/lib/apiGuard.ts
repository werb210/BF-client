// src/lib/apiGuard.ts

let initialized = false;

export function assertApiUsage() {
  if (initialized) return;

  initialized = true;

  const originalFetch = window.fetch;

  window.fetch = function (...args: any[]) {
    const input = args[0];

    if (typeof input === 'string' && input.startsWith('/api')) {
      throw new Error(
        'Direct fetch("/api/...") is forbidden. Use apiFetch() instead.'
      );
    }

    return originalFetch.apply(this, args as any);
  };
}
