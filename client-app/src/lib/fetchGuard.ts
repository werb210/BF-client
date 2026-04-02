const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const allowed = ["api.ts", "apiClient.ts"];
  const stack = new Error().stack || "";

  if (!allowed.some((entry) => stack.includes(entry))) {
    throw new Error("RAW_FETCH_BLOCKED");
  }

  return originalFetch(...args);
};

Object.freeze(window.fetch);

const forbidden = ["axios", "superagent"];

forbidden.forEach((name) => {
  if ((window as unknown as Record<string, unknown>)[name]) {
    throw new Error(`FORBIDDEN_HTTP_CLIENT:${name}`);
  }
});
