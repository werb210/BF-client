import { beforeEach, describe, expect, it, vi } from "vitest"
import { refreshSession } from "../sessionRefresh"
import { clearToken, getToken, setToken } from "@/auth/token"

// BF_CLIENT_BLOCK_v283_SESSION_REFRESH_FIX_v1
// Tests rewritten to match the no-rotation behavior. Prior to this fix
// refreshSession POSTed to a non-existent /api/auth/refresh endpoint and
// expected a {data: {token}} response. The fix downgrades it to a GET
// /api/auth/me token-validity ping: the existing token is kept on a 200,
// cleared on anything else. No new token is minted.

describe("refreshSession", () => {
  beforeEach(() => {
    localStorage.clear()
    clearToken()
    vi.restoreAllMocks()
  })

  it("returns false and clears token when /me responds non-ok", async () => {
    setToken("stale-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("", { status: 401 }))

    const ok = await refreshSession()

    expect(ok).toBe(false)
    expect(getToken()).toBeNull()
  })

  it("keeps the existing token and returns true when /me responds ok", async () => {
    setToken("current-token")
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "user-1" } }), { status: 200 }),
    )

    const ok = await refreshSession()

    expect(ok).toBe(true)
    expect(getToken()).toBe("current-token")
  })

  it("blocks nested refresh calls during an active API request", async () => {
    setToken("current-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ data: { id: "user-1" } }), { status: 200 })),
    )

    const first = refreshSession()
    const second = refreshSession()

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
