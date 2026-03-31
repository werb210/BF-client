import { beforeEach, describe, expect, it, vi } from "vitest"
import { enforceAuthStartup } from "@/app/bootstrap"
import { enforceLeadHandoff } from "@/app/init"
import { apiRequest } from "@/lib/api"

describe("auth hard lock", () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    vi.mocked(window.localStorage.getItem).mockImplementation((key: string) => storage.get(key) ?? null)
    vi.mocked(window.localStorage.setItem).mockImplementation((key: string, value: string) => {
      storage.set(key, value)
    })
    vi.mocked(window.localStorage.removeItem).mockImplementation((key: string) => {
      storage.delete(key)
    })
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      storage.clear()
    })

    window.localStorage.clear()
  })

  it("TEST 1: no token -> redirect", () => {
    expect(() => enforceAuthStartup()).toThrow("Not implemented: navigation")
  })

  it("TEST 2: no leadId -> blocked", () => {
    expect(() => enforceLeadHandoff()).toThrow("[BLOCKED] NO LEAD ID")
  })

  it("TEST 3: valid token -> app loads", () => {
    window.localStorage.setItem("token", "valid-token")
    expect(() => enforceAuthStartup()).not.toThrow()
  })

  it("TEST 4: API success -> returns data", async () => {
    window.localStorage.setItem("token", "valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(apiRequest("/api/health")).resolves.toEqual({ ok: true })
  })

  it("TEST 5: API 401 -> clears token + redirect", async () => {
    window.localStorage.setItem("token", "valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }))

    await expect(apiRequest("/api/health")).rejects.toThrow("Not implemented: navigation")
    expect(window.localStorage.getItem("token")).toBeNull()
  })

  it("TEST 6: empty response -> throws", async () => {
    window.localStorage.setItem("token", "valid-token")
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("", { status: 200 }))

    await expect(apiRequest("/api/health")).rejects.toThrow("[EMPTY RESPONSE]")
  })

  it("TEST 7: invalid path -> blocked", async () => {
    window.localStorage.setItem("token", "valid-token")
    await expect(apiRequest("/health")).rejects.toThrow("[INVALID API FORMAT]")
  })
})
