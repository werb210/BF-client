import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ ENV: { API_BASE: "https://server.test" } }));

import { clearAllApplicationDrafts, validateBootToken } from "../validateBootToken";

const VALID_UUID = "67b6bc97-1807-4590-a5ec-6784fc7e5056";

function seedAllKeys() {
  localStorage.setItem("bf_application_token", VALID_UUID);
  localStorage.setItem("boreal_session_id", "sess-1");
  localStorage.setItem("application_state", JSON.stringify({ applicationToken: VALID_UUID }));
  localStorage.setItem("application_data", "x");
  localStorage.setItem("boreal_app_cache", "x");
  localStorage.setItem("boreal_client_draft", "x");
  localStorage.setItem("boreal_draft", "x");
  localStorage.setItem("client_backup", "x");
  localStorage.setItem("client:draft:step:1", "x");
  localStorage.setItem("client:draft:step:3", "x");
  localStorage.setItem("client:step:current", "3");
  localStorage.setItem("applicationToken", VALID_UUID);
}

function expectAllCleared() {
  for (const k of [
    "bf_application_token",
    "boreal_session_id",
    "application_state",
    "application_data",
    "boreal_app_cache",
    "boreal_client_draft",
    "boreal_draft",
    "client_backup",
    "applicationToken",
    "client:draft:step:1",
    "client:draft:step:3",
    "client:step:current",
  ]) {
    expect(localStorage.getItem(k)).toBeNull();
  }
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateBootToken", () => {
  it("no-ops when no token is stored", async () => {
    const fetchImpl = vi.fn();
    const result = await validateBootToken({ fetchImpl: fetchImpl as any });
    expect(result).toEqual({ ok: false, reason: "no_token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("wipes everything when stored token is not UUID-shaped", async () => {
    localStorage.setItem("bf_application_token", "garbage");
    localStorage.setItem("boreal_draft", "x");
    const fetchImpl = vi.fn();
    const result = await validateBootToken({ fetchImpl: fetchImpl as any });
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
    expect(localStorage.getItem("bf_application_token")).toBeNull();
    expect(localStorage.getItem("boreal_draft")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("wipes ALL known keys + redirects on 404", async () => {
    seedAllKeys();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const redirect = vi.fn();
    const result = await validateBootToken({ fetchImpl: fetchImpl as any, redirect });
    expect(result).toEqual({ ok: false, reason: "stale" });
    expect(redirect).toHaveBeenCalledWith("/apply/step-1");
    expect(sessionStorage.getItem("boreal_toast_message")).toMatch(/expired/i);
    expectAllCleared();
  });

  it("wipes everything on 410", async () => {
    seedAllKeys();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 410 }));
    const redirect = vi.fn();
    const result = await validateBootToken({ fetchImpl: fetchImpl as any, redirect });
    expect(result).toEqual({ ok: false, reason: "stale" });
    expectAllCleared();
  });

  it("leaves storage alone on a 200 OK", async () => {
    seedAllKeys();
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const redirect = vi.fn();
    const result = await validateBootToken({ fetchImpl: fetchImpl as any, redirect });
    expect(result).toEqual({ ok: true });
    expect(redirect).not.toHaveBeenCalled();
    expect(localStorage.getItem("bf_application_token")).toBe(VALID_UUID);
  });

  it("leaves storage alone on a network error", async () => {
    seedAllKeys();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const redirect = vi.fn();
    const result = await validateBootToken({ fetchImpl: fetchImpl as any, redirect });
    expect(result).toEqual({ ok: false, reason: "network" });
    expect(redirect).not.toHaveBeenCalled();
    expect(localStorage.getItem("bf_application_token")).toBe(VALID_UUID);
  });

  it("clearAllApplicationDrafts nukes prefixed keys", () => {
    seedAllKeys();
    clearAllApplicationDrafts();
    expectAllCleared();
  });
});
