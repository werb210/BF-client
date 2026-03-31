import { describe, expect, it, vi } from "vitest"

describe("network guard", () => {
  it("blocks non-api fetch", async () => {
    const originalFetch = window.fetch
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    window.fetch = fetchMock as unknown as typeof window.fetch

    await import("@/lib/networkGuard")

    expect(() => window.fetch("https://evil.com")).toThrow("DIRECT_FETCH_BLOCKED")

    window.fetch = originalFetch
  })
})
