import api from "../api/client";
import { OfflineStore } from "../state/offline";

export const ProductSync = {
  load(): unknown[] {
    const cached = OfflineStore.load();
    if (cached?.lenderProducts) return cached.lenderProducts;
    return [];
  },

  save(products: unknown[]) {
    const existing = OfflineStore.load() || {};
    OfflineStore.save({
      ...existing,
      lenderProducts: products,
    });
  },

  invalidateCache() {
    const existing = OfflineStore.load() || {};
    if (existing.lenderProducts) {
      const rest = { ...existing };
      delete rest.lenderProducts;
      OfflineStore.save(rest);
    }
  },

  async sync() {
    ProductSync.invalidateCache();
    const res = await api.get("/api/lender-products");
    const { data } = res;
    const products = Array.isArray(data) ? data : [];
    if (!products.length) {
      throw new Error("No lender products returned from server.");
    }
    ProductSync.save(products);
    return products;
  },
};
