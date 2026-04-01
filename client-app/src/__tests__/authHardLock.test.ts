import { beforeEach, describe, expect, it, vi } from "vitest"
import { bootstrapSession } from "@/app/bootstrap"
import { apiCall } from "@/lib/apiClient"
import { clearToken, setToken } from "@/auth/token"
import { getTokenOrFail } from "@/services/token"

describe("auth hard lock", () => {
  beforeEach(() => {
    clearToken()
  })

  it("bootstrap does not gate auth", async () => {
    await expect(bootstrapSession()).resolves.toBeNull()
  })

  it.each(["", "undefined", "null"])('invalid stored token "%s" is blocked', (token) => {
    setToken(token)
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK]")
  })

  it("api request sets bearer header from token", async () => {
    setToken("valid-token")
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(
      apiCall("/api/health", {
        headers: { Authorization: "Bearer attacker" },
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        }),
      }),
    )
  })

  it("api 401 clears token and throws unauthorized", async () => {
    setToken("valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }))

    await expect(apiCall("/api/health")).rejects.toThrow("INVALID_TOKEN")
  })

  it("rejects private endpoint without token", async () => {
    await expect(apiCall("/api/private/test")).rejects.toThrow("AUTH_REQUIRED")
  })
})
