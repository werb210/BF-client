import { apiCall } from "@/lib/api";

export type ApiResult<T extends Record<string, any>> = Promise<T>;

export const api = {
  async get<T extends Record<string, any>>(url: string) {
    return (await apiCall(url)) as T;
  },

  async post<T extends Record<string, any>>(url: string, body?: unknown) {
    return (await apiCall(url, { method: "POST", body: JSON.stringify(body ?? {}) })) as T;
  },

  async patch<T extends Record<string, any>>(url: string, body?: unknown) {
    return (await apiCall(url, { method: "PATCH", body: JSON.stringify(body ?? {}) })) as T;
  }
};
