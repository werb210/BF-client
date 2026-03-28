import { apiClient } from "@/lib/apiClient";

export type ApiResult<T extends Record<string, any>> = Promise<T>;

export const api = {
  async get<T extends Record<string, any>>(url: string) {
    const res = await apiClient.get<T>(url);
    const { data } = res;
    return data;
  },

  async post<T extends Record<string, any>>(url: string, body?: unknown) {
    const res = await apiClient.post<T>(url, body);
    const { data } = res;
    return data;
  },

  async patch<T extends Record<string, any>>(url: string, body?: unknown) {
    const res = await apiClient.patch<T>(url, body);
    const { data } = res;
    return data;
  }
};
