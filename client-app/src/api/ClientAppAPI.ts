import { apiRequest } from "@/lib/apiClient";

export type ApiResult<T extends Record<string, any>> = Promise<T>;

export const api = {
  async get<T extends Record<string, any>>(url: string) {
    return (await apiRequest(url)) as T;
  },

  async post<T extends Record<string, any>>(url: string, body?: unknown) {
    return (await apiRequest(url, { method: "POST", body: JSON.stringify(body ?? {}) })) as T;
  },

  async patch<T extends Record<string, any>>(url: string, body?: unknown) {
    return (await apiRequest(url, { method: "PATCH", body: JSON.stringify(body ?? {}) })) as T;
  }
};
