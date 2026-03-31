import { apiRequest } from "@/api/client";

export async function fetchCreditPrefill(id: string) {
  return apiRequest(`/api/credit-readiness/${id}`);
}
