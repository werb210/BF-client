import { apiRequest } from "@/lib/api";

export async function checkServerHealth() {
  const res = await apiRequest("/api/health");
  return res;
}
