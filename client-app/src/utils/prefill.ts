import { apiClient } from "@/api/client";

export interface CreditPrefill {
  companyName?: string | null;
  industry?: string | null;
  yearsInBusiness?: number | string | null;
  annualRevenue?: number | string | null;
  monthlyRevenue?: number | string | null;
  arBalance?: number | string | null;
  availableCollateral?: boolean | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  profitable?: boolean | null;
  score?: string | null;
}

/**
 * Fetch readiness prefill data using the token issued by the website.
 * Wraps GET /api/client/readiness-prefill?token=... and returns the
 * `prefill` object only, or null when not found / error.
 */
export async function fetchPrefill(token: string): Promise<CreditPrefill | null> {
  if (!token) return null;

  try {
    const res = await apiClient.get<{
      found?: boolean;
      prefill?: CreditPrefill;
    }>(`/api/client/readiness-prefill?token=${encodeURIComponent(token)}`);
    const body = res?.data;
    if (!body || body.found === false) return null;
    return body.prefill ?? null;
  } catch {
    return null;
  }
}
