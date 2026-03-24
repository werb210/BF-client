import api from "@/api/client";

export interface ContinuationResponse {
  pendingApplicationId?: string;
}

type ContinuationPayload = {
  pendingApplicationId?: string;
};

export async function checkContinuation(email: string): Promise<ContinuationResponse> {
  const response = await api.get<ContinuationPayload>(
    `/api/applications/continuation?email=${encodeURIComponent(email)}`
  );
  const payload = response.data as ContinuationPayload;
  return payload;
}

export async function loadContinuation(): Promise<null> {
  return null;
}
