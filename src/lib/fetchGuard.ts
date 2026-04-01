const originalFetch = window.fetch.bind(window);

window.fetch = (...args) => {
  const stack = new Error().stack || "";

  if (!stack.includes("api.ts")) {
    throw new Error("RAW_FETCH_BLOCKED");
  }

  return originalFetch(...args);
};
