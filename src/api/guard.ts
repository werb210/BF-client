export function enforceApiUsage() {
  if (typeof window !== "undefined") {
    const originalFetch = window.fetch;

    window.fetch = function () {
      throw new Error(
        "Direct raw HTTP usage is запрещено. Use apiFetch instead."
      );
    };

    (window as any).__originalFetch = originalFetch;
  }
}
