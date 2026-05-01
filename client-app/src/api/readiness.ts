import { apiRequest } from "@/lib/api";

export type ReadinessPrefillResponse = {
  found: boolean;
  prefill: Record<string, unknown>;
};

// BF_CLIENT_v?_BLOCK_1_15_PHONE_BASED_READINESS_PREFILL
// The server accepts EITHER ?token=... OR ?phone=... — token takes priority
// per the contract in BF-Server src/routes/client/index.ts. The website-side
// flow only knows the user's phone (no token in the URL across domains), so
// we hit the phone path here.
export async function fetchReadinessPrefill(
  identifier: string,
  by: "token" | "phone" = "token",
): Promise<ReadinessPrefillResponse> {
  const param = by === "phone" ? "phone" : "token";
  return apiRequest<ReadinessPrefillResponse>(
    `/api/client/readiness-prefill?${param}=${encodeURIComponent(identifier)}`,
  );
}
