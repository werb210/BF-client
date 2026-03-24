import api from "@/api/client";

export interface ContinuationResponse {
  pendingApplicationId?: string;
}

export async function checkContinuation(email: string): Promise<ContinuationResponse> {
  const response = await api.get<ContinuationResponse>(
    `/api/applications/continuation?email=${encodeURIComponent(email)}`
  );
  return response.data;
}

export async function loadContinuation(): Promise<null> {
  return null;
}
