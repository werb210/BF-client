import api from "@/api/client";

export interface ContinuationResponse {
  pendingApplicationId?: string;
}

export async function checkContinuation(email: string): Promise<ContinuationResponse> {
  const data = await api.get<ContinuationResponse>(
    `/api/applications/continuation?email=${encodeURIComponent(email)}`
  );
  return data;
}

export async function loadContinuation(): Promise<null> {
  return null;
}
