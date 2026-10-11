// BF_CLIENT_v789_SW_NO_AUTH_CACHE
import { describe, expect, it, vi } from "vitest";
import { deleteAllCaches, isApiRequest, isPublicLenderProductsRequest } from "../swRoutes";

const u = (path: string) => new URL(path, "https://server.boreal.financial");

describe("service worker routing", () => {
  it("caches only the public lender-products catalogue", () => {
    expect(isPublicLenderProductsRequest(u("/api/client/lender-products"), "GET")).toBe(true);
    expect(isPublicLenderProductsRequest(u("/api/client/lender-products?country=CA"), "GET")).toBe(true);
    expect(isPublicLenderProductsRequest(u("/api/client/lender-products"), "POST")).toBe(false);
  });

  it("never caches the authenticated required-docs lookup or any other API call", () => {
    for (const path of [
      "/api/portal/lender-products/required-docs?country=CA",
      "/api/portal/lender-products",
      "/api/client/application/abc/status",
      "/api/client/messages",
      "/api/offers/1/accept",
    ]) {
      expect(isPublicLenderProductsRequest(u(path), "GET")).toBe(false);
      expect(isApiRequest(u(path))).toBe(true);
    }
  });

  it("treats pages and assets as non-API", () => {
    expect(isApiRequest(new URL("https://client.boreal.financial/apply/step-1"))).toBe(false);
    expect(isApiRequest(new URL("https://client.boreal.financial/assets/index.js"))).toBe(false);
  });

  it("CLEAR_CACHES deletes every cache", async () => {
    const names = ["workbox-precache-v2", "bf-client-api", "bf-client-lender-products", "bf-client-images"];
    const remaining = new Set(names);
    const storage = {
      keys: vi.fn(async () => [...remaining]),
      delete: vi.fn(async (name: string) => remaining.delete(name)),
    } as unknown as CacheStorage;
    await deleteAllCaches(storage);
    expect(remaining.size).toBe(0);
    expect(storage.delete).toHaveBeenCalledTimes(names.length);
  });
});
