import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequest, setToken } = vi.hoisted(() => ({ apiRequest: vi.fn(), setToken: vi.fn() }));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@/lib/api", () => ({ apiRequest }));
vi.mock("@/auth/token", () => ({ setToken }));

import { PasskeyError, passkeysSupported, signInWithPasskey } from "../passkeys";

const bytes = (values: number[]) => new Uint8Array(values).buffer;

describe("browser passkeys (v600)", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    setToken.mockReset();
    Object.defineProperty(window, "PublicKeyCredential", { configurable: true, value: class PublicKeyCredential {} });
  });

  it("only advertises passkeys when the WebAuthn credential methods exist", () => {
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { create: vi.fn(), get: vi.fn() },
    });
    expect(passkeysSupported()).toBe(true);
  });

  it("converts request values, verifies the assertion and stores the session token", async () => {
    const get = vi.fn().mockResolvedValue({
      id: "credential-id",
      rawId: bytes([1, 2]),
      type: "public-key",
      response: {
        clientDataJSON: bytes([3]),
        authenticatorData: bytes([4]),
        signature: bytes([5]),
        userHandle: null,
      },
    });
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { create: vi.fn(), get },
    });
    apiRequest
      .mockResolvedValueOnce({ challenge: "AQI", allowCredentials: [{ type: "public-key", id: "Aw" }] })
      .mockResolvedValueOnce({ token: "jwt" });

    await expect(signInWithPasskey()).resolves.toEqual({ token: "jwt" });
    expect(get).toHaveBeenCalledWith({
      publicKey: expect.objectContaining({ challenge: bytes([1, 2]), allowCredentials: [expect.objectContaining({ id: bytes([3]) })] }),
    });
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/client/passkeys/login/verify", // BF_CLIENT_PASSKEY_FIX_v691 - the server route
      expect.objectContaining({ method: "POST" }),
    );
    expect(setToken).toHaveBeenCalledWith("jwt");
  });

  it("turns a cancelled browser prompt into a useful fallback message", async () => {
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { create: vi.fn(), get: vi.fn().mockRejectedValue(new DOMException("cancelled", "NotAllowedError")) },
    });
    apiRequest.mockResolvedValue({ challenge: "AQ" });
    await expect(signInWithPasskey()).rejects.toEqual(expect.objectContaining<Partial<PasskeyError>>({ code: "cancelled" }));
  });
});
