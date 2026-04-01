import { apiCall } from "@/lib/api";

export async function checkServerHealth() {
  const res = await apiCall("/api/health");
  return res;
}
