// BF_CLIENT_ENROLL_REASON_v335
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  checkBiometry: vi.fn(),
  apiRequest: vi.fn(),
  getToken: vi.fn(),
  setCredential: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
}));
vi.mock("@aparajita/capacitor-biometric-auth", () => ({
  BiometricAuth: { authenticate: mocks.authenticate, checkBiometry: mocks.checkBiometry },
}));
vi.mock("@/lib/api", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("@/auth/token", () => ({ getToken: mocks.getToken, setToken: vi.fn() }));
vi.mock("@/auth/credentialStore", () => ({
  namedCredentialStore: { get: vi.fn(), set: mocks.setCredential, clear: vi.fn() },
}));

import { enrollDeviceWithReason } from "../deviceSignIn";

describe("Face ID enrollment reasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkBiometry.mockResolvedValue({ isAvailable: true });
    mocks.getToken.mockReturnValue("client-token");
    mocks.authenticate.mockResolvedValue(undefined);
  });

  it("asks for a client session before presenting Face ID", async () => {
    mocks.getToken.mockReturnValue(null);
    await expect(enrollDeviceWithReason()).resolves.toEqual({
      ok: false,
      stage: "session",
      message: "Sign in with a text code first, then turn Face ID on.",
    });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("does not show an error when the biometric prompt is dismissed", async () => {
    mocks.authenticate.mockRejectedValue(new Error("cancelled"));
    await expect(enrollDeviceWithReason()).resolves.toEqual({ ok: false, stage: "cancelled", message: "" });
    expect(mocks.apiRequest).not.toHaveBeenCalled();
  });

  it("explains when the server rejects a non-client session", async () => {
    mocks.getToken.mockReturnValue(`header.${btoa(JSON.stringify({ role: "Admin" }))}.signature`);
    mocks.apiRequest.mockRejectedValue(new Error("401 client_session_required"));
    const result = await enrollDeviceWithReason();
    expect(result).toEqual({
      ok: false,
      stage: "server",
      message: 'Face ID could not be turned on. This sign-in is a "Admin" session, not a client one. Sign out, then sign in again with a text code.',
    });
  });

  it("stores a valid credential after successful enrollment", async () => {
    mocks.apiRequest.mockResolvedValue({ credentialId: "credential", secret: "secret" });
    await expect(enrollDeviceWithReason()).resolves.toEqual({ ok: true });
    expect(mocks.setCredential).toHaveBeenCalledWith(
      "device-sign-in",
      JSON.stringify({ credentialId: "credential", secret: "secret" }),
    );
  });
});
