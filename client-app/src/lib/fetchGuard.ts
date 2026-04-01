const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const stack = new Error().stack || "";

  if (!stack.includes("api.ts")) {
    throw new Error("RAW_FETCH_BLOCKED");
  }

  return originalFetch(...args);
};

Object.freeze(window.fetch);

const forbidden = ["axios", "superagent"];

forbidden.forEach((name) => {
  if ((window as Record<string, unknown>)[name]) {
    throw new Error(`FORBIDDEN_HTTP_CLIENT:${name}`);
  }
});
