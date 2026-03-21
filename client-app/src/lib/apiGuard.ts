// src/lib/apiGuard.ts

let initialized = false;

export function assertApiUsage() {
  if (initialized) return;

  // 🚨 DO NOT run in tests
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'test'
  ) {
    return;
  }

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
