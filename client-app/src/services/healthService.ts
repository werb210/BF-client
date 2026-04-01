import { apiCall } from "@/lib/apiClient";

export async function checkServerHealth() {
  const res = await apiCall("/api/health");
  return res;
}
