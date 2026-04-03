import { beforeEach, describe, expect, it, vi } from "vitest"
import { refreshSession } from "../sessionRefresh"
import { clearToken, getToken, setToken } from "@/auth/token"

describe("refreshSession", () => {
  beforeEach(() => {
    localStorage.clear()
    clearToken()
    vi.restoreAllMocks()
  })

  it("returns false and clears token when refresh response is not ok", async () => {
    setToken("stale-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("", { status: 500 }))

    const ok = await refreshSession()

    expect(ok).toBe(false)
    expect(getToken()).toBeNull()
  })

  it("stores refreshed token and returns true", async () => {
    setToken("old-token")
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", data: { token: "new-token" } }), { status: 200 }),
    )

    const ok = await refreshSession()

    expect(ok).toBe(true)
    expect(getToken()).toBe("new-token")
  })

  it("blocks nested refresh calls during an active API request", async () => {
    setToken("old-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ status: "ok", data: { token: "new-token" } }), { status: 200 })),
    )

    const first = refreshSession()
    const second = refreshSession()

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
