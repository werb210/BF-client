import { afterEach, describe, expect, it, vi } from "vitest";
import { identifyClarity } from "@/utils/analytics";

describe("identifyClarity", () => {
  afterEach(() => {
    delete (window as any).clarity;
  });

  it("identifies and tags the session with digits from the verified phone", () => {
    const clarity = vi.fn();
    (window as any).clarity = clarity;

    identifyClarity("+1 (416) 555-0123");

    expect(clarity).toHaveBeenNthCalledWith(1, "identify", "14165550123");
    expect(clarity).toHaveBeenNthCalledWith(2, "set", "phone", "14165550123");
  });

  it("does nothing when Clarity is unavailable or the phone has no digits", () => {
    expect(() => identifyClarity("+1 416 555 0123")).not.toThrow();

    const clarity = vi.fn();
    (window as any).clarity = clarity;
    identifyClarity("not-a-phone");

    expect(clarity).not.toHaveBeenCalled();
  });

  it("never propagates an analytics error", () => {
    (window as any).clarity = vi.fn(() => {
      throw new Error("Clarity failed");
    });

    expect(() => identifyClarity("4165550123")).not.toThrow();
  });
});
