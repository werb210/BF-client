import { describe, expect, it, vi } from "vitest"
import { installNetworkGuard } from "@/lib/networkGuard"

describe("network guard", () => {
  it("blocks non-api fetch", async () => {
    const originalFetch = global.fetch
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    global.fetch = fetchMock as any

    installNetworkGuard(true)

    expect(() => window["fetch"]("https://evil.com")).toThrow("DIRECT_FETCH_BLOCKED_USE_APIREQUEST")

    global.fetch = originalFetch
  })
})
