import api from "../api/client";
import type { ClientLenderProduct } from "../api/lenders";
import { OfflineStore } from "../state/offline";

export const ProductSync = {
  load(): ClientLenderProduct[] {
    const cached = OfflineStore.load();
    const products = cached?.lenderProducts;
    return Array.isArray(products) ? (products as ClientLenderProduct[]) : [];
  },

  save(products: ClientLenderProduct[]) {
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

  async sync(): Promise<ClientLenderProduct[]> {
    ProductSync.invalidateCache();
    const res = await api.get<unknown>("/api/client/lender-products");
    const { data } = res;
    const products = Array.isArray(data) ? (data as ClientLenderProduct[]) : [];
    if (!products.length) {
      throw new Error("No lender products returned from server.");
    }
    ProductSync.save(products);
    return products;
  },
};
