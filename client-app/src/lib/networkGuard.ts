const originalFetch = window.fetch.bind(window)

function isApiPath(input: RequestInfo | URL): boolean {
  if (typeof input === "string") return input.startsWith("/api/")
  if (input instanceof URL) return input.pathname.startsWith("/api/")
  if (input instanceof Request) return input.url.includes("/api/")
  return false
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (!isApiPath(input)) {
    throw new Error("DIRECT_FETCH_BLOCKED_USE_APIREQUEST")
  }
  return originalFetch(input, init)
}) as typeof window.fetch

export {}
