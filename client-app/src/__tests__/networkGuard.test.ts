import { describe, expect, it, vi } from "vitest"

describe("network guard", () => {
  it("blocks non-api fetch", async () => {
    const originalFetch = global.fetch
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    global.fetch = fetchMock as any

    await import("@/lib/networkGuard")

    expect(() => window["fetch"]("https://evil.com")).toThrow("DIRECT_FETCH_BLOCKED_USE_APIREQUEST")

    global.fetch = originalFetch
  })
})
