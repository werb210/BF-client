import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("../credentialStore", () => ({ credentialStore: store }));

import { clearToken, getToken, hydrateToken, setToken } from "../token";

describe("native token storage failures", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    store.get.mockResolvedValue(null);
    store.set.mockResolvedValue(undefined);
    store.clear.mockResolvedValue(undefined);
    await hydrateToken();
  });

  it("does not use plaintext localStorage when native hydration has no credential", () => {
    localStorage.setItem("bf_jwt_token", "insecure-native-fallback");
    expect(getToken()).toBeNull();
  });

  it("handles persistence rejection without logging the credential value", async () => {
    const credentialValue = "secret-jwt-value";
    const failure = new Error("keychain write failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    store.set.mockRejectedValueOnce(failure);

    setToken(credentialValue);
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());

    expect(getToken()).toBe(credentialValue);
    expect(consoleError).toHaveBeenCalledWith("Secure credential persistence failed", failure);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(credentialValue);
    consoleError.mockRestore();
  });

  it("handles clear rejection without logging a credential value", async () => {
    const credentialValue = "secret-jwt-value";
    const failure = new Error("keychain clear failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    store.clear.mockRejectedValueOnce(failure);

    setToken(credentialValue);
    clearToken();
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith("Secure credential clear failed", failure));

    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(credentialValue);
    consoleError.mockRestore();
  });
});
