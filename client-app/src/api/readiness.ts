import { apiRequest } from "@/lib/api";

export type ReadinessPrefillResponse = {
  found: boolean;
  prefill: Record<string, unknown>;
};

export async function fetchReadinessPrefill(token: string): Promise<ReadinessPrefillResponse> {
  return apiRequest<ReadinessPrefillResponse>(`/api/client/readiness-prefill?token=${encodeURIComponent(token)}`);
}
