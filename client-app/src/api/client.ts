import api, { apiRequest, buildUrl } from "@/lib/api";

export const apiClient = api;

export { apiRequest };

export function buildApiUrl(path: string): string {
  return buildUrl(path);
}

export default api;
