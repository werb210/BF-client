// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileRef, readToken, resolveBaseUrl, stopBorealRuntime } from "../borealRuntime";

describe("v131 boreal runtime", () => {
  beforeEach(() => {
    localStorage.clear();
    stopBorealRuntime();
  });

  it("reads a token from any known key", () => {
    localStorage.setItem("auth_token", "abcdefghijklmnop");
    expect(readToken()).toBe("abcdefghijklmnop");
  });

  it("strips json quoting", () => {
    localStorage.setItem("token", '"abcdefghijklmnop"');
    expect(readToken()).toBe("abcdefghijklmnop");
  });

  it("ignores junk short values", () => {
    localStorage.setItem("token", "x");
    expect(readToken()).toBeNull();
  });

  it("returns null with nothing stored", () => expect(readToken()).toBeNull());

  it("falls back to the production server url", () => expect(resolveBaseUrl()).toContain("http"));

  it("never returns a trailing slash", () => expect(resolveBaseUrl().endsWith("/")).toBe(false));

  it("reads a blob-style fileRef through fetch", async () => {
    const blob = new Blob(["hello"]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }));
    await expect(readFileRef("blob:https://x.ca/abc")).resolves.toBe(blob);
    vi.unstubAllGlobals();
  });

  it("rejects an empty fileRef", async () => {
    await expect(readFileRef("")).rejects.toThrow("empty fileRef");
  });

  it("surfaces a failed blob read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(readFileRef("blob:https://x.ca/abc")).rejects.toThrow("could not read");
    vi.unstubAllGlobals();
  });
});
