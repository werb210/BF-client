import { apiCall } from "@/lib/api";

export interface ContinuationResponse {
  pendingApplicationId?: string;
}

type ContinuationPayload = {
  pendingApplicationId?: string;
};

export async function checkContinuation(email: string): Promise<ContinuationResponse> {
  const payload = await apiCall<ContinuationPayload>(
    `/applications/continuation?email=${encodeURIComponent(email)}`
  );
  return payload;
}

export async function loadContinuation(): Promise<null> {
  return null;
}
