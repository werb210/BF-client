import { apiRequest } from "@/lib/apiClient";

export async function checkServerHealth() {
  const res = await apiRequest("/api/health");
  return res;
}
