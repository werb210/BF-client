import { describe, it, expect, beforeEach } from "vitest";

// jsdom provides localStorage
import { getToken, setToken, clearToken } from "@/auth/token";

beforeEach(() => {
  localStorage.clear();
  clearToken();
});

describe("token storage", () => {
  it("sets and gets from single key", () => {
    setToken("test-jwt");
    expect(getToken()).toBe("test-jwt");
    expect(localStorage.getItem("bf_jwt_token")).toBe("test-jwt");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("clears both keys on clearToken", () => {
    localStorage.setItem("auth_token", "old-token");
    localStorage.setItem("bf_jwt_token", "old-token");
    clearToken();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("bf_jwt_token")).toBeNull();
  });

  it("migrates legacy auth_token key on first read", () => {
    localStorage.setItem("auth_token", "legacy-token");
    const t = getToken();
    expect(t).toBe("legacy-token");
    expect(localStorage.getItem("bf_jwt_token")).toBe("legacy-token");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
