import { beforeEach, describe, expect, it, vi } from "vitest"
import { bootstrapSession } from "@/app/bootstrap"
import { apiRequest, setToken } from "@/lib/api"
import { getTokenOrFail } from "@/services/token"

describe("auth hard lock", () => {
  beforeEach(() => {
    setToken(null)
  })

  it("bootstrap does not gate auth", async () => {
    await expect(bootstrapSession()).resolves.toBeNull()
  })

  it.each(["", "undefined", "null"])("invalid stored token '%s' is blocked", (token) => {
    setToken(token)
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK]")
  })

  it("api request uses forced auth headers", async () => {
    setToken("valid-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(
      apiRequest("/api/health", {
        headers: { Authorization: "Bearer attacker" },
      })
    ).resolves.toEqual({ ok: true })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
      })
    )
  })

  it("credentials injection is ignored", async () => {
    setToken("valid-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await apiRequest("/api/health", {
      credentials: "include",
    })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(init.credentials).toBe("include")
  })

  it("api 401 clears token and throws unauthorized", async () => {
    setToken("valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }))

    await expect(apiRequest("/api/health")).rejects.toThrow("UNAUTHORIZED")
  })

  it("invalid path injection is blocked", async () => {
    setToken("valid-token")
    await expect(apiRequest("/api//health")).rejects.toThrow("MALFORMED_PATH")
  })

  it("rejects private endpoint without token", async () => {
    await expect(apiRequest("/api/private/test")).rejects.toThrow("AUTH_REQUIRED")
  })
})
