const originalFetch = window.fetch.bind(window)

window.fetch = function (...args) {
  const url = args[0]

  if (typeof url === "string" && !url.startsWith("/api/")) {
    throw new Error("DIRECT_FETCH_BLOCKED")
  }

  return originalFetch(...args)
}
