import { apiRequest } from "@/api/client";

export async function fetchCreditPrefill(id: string) {
  return apiRequest(`/credit-readiness/${id}`);
}
