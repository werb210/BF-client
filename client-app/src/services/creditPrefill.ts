import { apiCall } from "@/api/client";

export async function fetchCreditPrefill(id: string) {
  return apiCall(`/api/credit-readiness/${id}`);
}
