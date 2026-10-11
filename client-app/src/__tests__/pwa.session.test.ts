import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientStorage } from "../auth/logout";

function createStorage(initial: Record<string, string> = {}) {
  let store = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe("logout cleanup", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
  });

  it("clears local and session storage", () => {
    localStorage.setItem("foo", "bar");
    sessionStorage.setItem("baz", "qux");

    clearClientStorage();

    expect(localStorage.getItem("foo")).toBeNull();
    expect(sessionStorage.getItem("baz")).toBeNull();
  });
});
