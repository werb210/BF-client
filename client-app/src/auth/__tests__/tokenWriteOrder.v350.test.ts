// BF_CLIENT_TOKEN_WRITE_ORDER_v350
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), clear: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("../credentialStore", () => ({ credentialStore: store }));

import { clearToken, flushTokenWrites, getToken, hydrateToken, setToken } from "../token";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("Keychain writes run in call order", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    store.get.mockResolvedValue(null);
    store.set.mockResolvedValue(undefined);
    store.clear.mockResolvedValue(undefined);
    await flushTokenWrites();
    await hydrateToken();
  });

  it("sign out then sign in: the new token is written after the clear, never wiped", async () => {
    const slowClear = deferred<void>();
    store.clear.mockReturnValueOnce(slowClear.promise);

    setToken("admin-old");
    clearToken();
    setToken("client-new");
    await Promise.resolve(); await Promise.resolve();

    // The clear is still running, so the new token's write must not have started.
    expect(store.set.mock.calls.map((c) => c[0])).toEqual(["admin-old"]);

    slowClear.resolve();
    await flushTokenWrites();

    const order = [
      ...store.set.mock.invocationCallOrder.map((n, i) => [n, `set:${store.set.mock.calls[i][0]}`] as const),
      ...store.clear.mock.invocationCallOrder.map((n) => [n, "clear"] as const),
    ].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    expect(order).toEqual(["set:admin-old", "clear", "set:client-new"]);
    expect(getToken()).toBe("client-new");
  });

  it("a failed write does not block the writes after it", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    store.clear.mockRejectedValueOnce(new Error("keychain clear failed"));

    clearToken();
    setToken("after-failure");
    await flushTokenWrites();

    expect(store.set).toHaveBeenCalledWith("after-failure");
    expect(consoleError).toHaveBeenCalledWith("Secure credential clear failed", expect.any(Error));
    consoleError.mockRestore();
  });

  it("a slow hydrate never overwrites a token set while it was reading", async () => {
    const slowGet = deferred<string | null>();
    store.get.mockReturnValueOnce(slowGet.promise);

    const hydrating = hydrateToken();
    await Promise.resolve(); await Promise.resolve();
    setToken("fresh-session");
    slowGet.resolve("stale-session");
    await hydrating;

    expect(getToken()).toBe("fresh-session");
  });

  it("hydrate restores the stored token when nothing changed meanwhile", async () => {
    store.get.mockResolvedValueOnce("stored-session");
    await hydrateToken();
    expect(getToken()).toBe("stored-session");
  });
});
