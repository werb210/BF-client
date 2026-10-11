// BF_CLIENT_v789_MIC_PERMISSION
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureMicrophonePermission, MIC_DENIED_MESSAGE, MIC_UNAVAILABLE_MESSAGE } from "../microphone";

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, "mediaDevices", { value, configurable: true });
}

afterEach(() => setMediaDevices(undefined));

describe("ensureMicrophonePermission", () => {
  it("asks for audio and releases the stream when granted", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }));
    setMediaDevices({ getUserMedia });
    await expect(ensureMicrophonePermission()).resolves.toEqual({ ok: true, reason: "granted", message: null });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stop).toHaveBeenCalled();
  });

  it("explains how to allow the microphone when it is refused", async () => {
    setMediaDevices({ getUserMedia: vi.fn(async () => { throw Object.assign(new Error("no"), { name: "NotAllowedError" }); }) });
    const result = await ensureMicrophonePermission();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("denied");
    expect(result.message).toBe(MIC_DENIED_MESSAGE);
    expect(result.message).toMatch(/settings/);
  });

  it("says there is no microphone when none is found or the API is missing", async () => {
    setMediaDevices({ getUserMedia: vi.fn(async () => { throw Object.assign(new Error("none"), { name: "NotFoundError" }); }) });
    expect((await ensureMicrophonePermission()).message).toBe(MIC_UNAVAILABLE_MESSAGE);
    setMediaDevices(undefined);
    expect((await ensureMicrophonePermission()).reason).toBe("unavailable");
  });
});
