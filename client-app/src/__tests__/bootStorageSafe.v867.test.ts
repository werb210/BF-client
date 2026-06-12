import { describe, expect, it } from "vitest";
import { ensureSafe, makeMemoryStorage } from "../bootStorageSafe";

describe("BF_CLIENT_BLOCK_v867 — storage shim", () => {
  it("makeMemoryStorage behaves like Web Storage", () => {
    const s = makeMemoryStorage();
    expect(s.getItem("a")).toBeNull();
    s.setItem("a", "1");
    expect(s.getItem("a")).toBe("1");
    expect(s.length).toBe(1);
    expect(s.key(0)).toBe("a");
    s.removeItem("a");
    expect(s.getItem("a")).toBeNull();
    s.setItem("b", "2");
    s.clear();
    expect(s.length).toBe(0);
  });

  it("ensureSafe replaces a throwing storage with a working in-memory one", () => {
    const throwing = {
      getItem(): string | null { throw new Error("blocked"); },
      setItem(): void { throw new Error("blocked"); },
      removeItem(): void { throw new Error("blocked"); },
      clear(): void { throw new Error("blocked"); },
      key(): string | null { throw new Error("blocked"); },
      length: 0,
    };
    const target: any = { localStorage: throwing };

    ensureSafe("localStorage", target);

    expect(() => target.localStorage.setItem("k", "v")).not.toThrow();
    expect(target.localStorage.getItem("k")).toBe("v");
  });

  it("ensureSafe leaves a working storage untouched", () => {
    const working = makeMemoryStorage();
    const target: any = { localStorage: working };

    ensureSafe("localStorage", target);

    expect(target.localStorage).toBe(working);
  });

  it("ensureSafe handles a storage whose getter itself throws", () => {
    const target: any = {};
    Object.defineProperty(target, "localStorage", {
      configurable: true,
      get() { throw new Error("denied"); },
    });

    expect(() => ensureSafe("localStorage", target)).not.toThrow();
    expect(() => target.localStorage.setItem("k", "v")).not.toThrow();
    expect(target.localStorage.getItem("k")).toBe("v");
  });
});
