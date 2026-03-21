export function forbidRawFetch() {
  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    const url = args[0]?.toString?.() || "";

    if (url.includes("/api/")) {
      throw new Error(
        "Direct fetch to API is forbidden. Use apiFetch() instead."
      );
    }

    return originalFetch.apply(this, args as any);
  };
}
