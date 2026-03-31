import { apiRequest } from "@/lib/apiClient";

export interface ContinuationResponse {
  pendingApplicationId?: string;
}

type ContinuationPayload = {
  pendingApplicationId?: string;
};

export async function checkContinuation(email: string): Promise<ContinuationResponse> {
  const payload = await apiRequest<ContinuationPayload>(
    `/applications/continuation?email=${encodeURIComponent(email)}`
  );
  return payload;
}

export async function loadContinuation(): Promise<null> {
  return null;
}
