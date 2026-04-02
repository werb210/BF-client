import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { retry } from "../retry";

describe("retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("recovers from transient failures", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("temporary");
      }
      return "ok";
    });

    const pending = retry(fn, { attempts: 3, delayMs: 500 });
    const assertion = expect(pending).resolves.toBe("ok");

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws FAILED_AFTER_RETRY after exhausting attempts", async () => {
    const fn = vi.fn(async () => {
      throw new Error("down");
    });

    const pending = retry(fn, { attempts: 3, delayMs: 500 });
    const assertion = expect(pending).rejects.toMatchObject({ message: "FAILED_AFTER_RETRY" });

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
