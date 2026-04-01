import { beforeEach, describe, expect, it, vi } from "vitest"
import { enforceSession } from "@/auth/sessionGuard"
import { refreshSession } from "@/auth/sessionRefresh"
import { clearToken, getToken, setToken } from "@/auth/token"

describe("auth hard lock", () => {
  beforeEach(() => {
    clearToken()
    Object.defineProperty(window, "location", {
      value: { href: "https://client.example/" },
      writable: true,
      configurable: true,
    })
  })

  it("blocks unauthenticated users by routing to login", () => {
    expect(() => enforceSession()).toThrow("[SESSION BLOCKED]")
    expect(window.location.href).toContain("/login")
  })

  it("allows authenticated users through", () => {
    setToken("valid-token")

    expect(() => enforceSession()).not.toThrow()
    expect(window.location.href).toBe("https://client.example/")
  })

  it("clears expired session state and then routes to login", async () => {
    setToken("expired-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }))

    const refreshed = await refreshSession()

    expect(refreshed).toBe(false)
    expect(getToken()).toBeNull()
    expect(() => enforceSession()).toThrow("[SESSION BLOCKED]")
    expect(window.location.href).toContain("/login")
  })
})
