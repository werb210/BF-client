const originalFetch = window.fetch;

window.fetch = (...args) => {
  const err = new Error();

  if (!err.stack?.includes("api.ts")) {
    throw new Error("RAW_FETCH_BLOCKED");
  }

  return originalFetch(...args);
};

Object.freeze(window.fetch);
