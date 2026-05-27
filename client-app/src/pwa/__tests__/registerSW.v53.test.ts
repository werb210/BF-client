import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyClientSWUpdate, registerClientSW } from "../registerSW";

vi.mock("workbox-window", () => {
  class MockWorkbox extends EventTarget {
    messageSkipWaiting = vi.fn();
    register = vi.fn().mockResolvedValue(undefined);
  }
  return { Workbox: MockWorkbox };
});

describe("BF_CLIENT_BLOCK_v53_SW_HARD_RELOAD_FALLBACK_v1", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, "window", {
      value: { location: { reload: vi.fn() }, dispatchEvent: vi.fn(), addEventListener: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { addEventListener: vi.fn() } },
      configurable: true,
    });
    Object.defineProperty(import.meta, "env", { value: { DEV: false }, configurable: true });
  });

  it("reloads within 3.1s even if controllerchange never fires", async () => {
    registerClientSW();
    await Promise.resolve();
    applyClientSWUpdate();
    vi.advanceTimersByTime(3100);
    expect(window.location.reload).toHaveBeenCalled();
  });
});
