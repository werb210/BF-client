import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ enabled: true }));
const secureCredentials = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.enabled },
  registerPlugin: () => secureCredentials,
}));

import { credentialStore } from "../credentialStore";

describe("credentialStore platform isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    native.enabled = true;
  });

  it("returns null when the native credential read rejects without consulting localStorage", async () => {
    localStorage.setItem("bf_jwt_token", "plaintext-jwt-must-not-be-restored");
    const storageRead = vi.spyOn(Storage.prototype, "getItem");
    secureCredentials.get.mockRejectedValueOnce(new Error("native read failed"));

    await expect(credentialStore.get()).resolves.toBeNull();
    expect(storageRead).not.toHaveBeenCalled();
  });

  it("retains browser credential behavior", async () => {
    native.enabled = false;
    localStorage.setItem("bf_jwt_token", "browser-value");

    await expect(credentialStore.get()).resolves.toBe("browser-value");
    expect(secureCredentials.get).not.toHaveBeenCalled();
  });
});
