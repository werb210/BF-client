// src/lib/apiGuard.ts

let initialized = false;

export function assertApiUsage() {
  if (initialized || typeof window === "undefined") return;

  initialized = true;

  const originalFetch = window.fetch;

  window.fetch = function (...args: any[]) {
    const input = args[0];

    if (typeof input === "string" && input.startsWith("/legacy-api")) {
      console.warn("Bypassing API contract enforcement temporarily");
    }

    return originalFetch.apply(this, args as any);
  };
}
