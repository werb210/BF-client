import { buildApiUrl } from "@/api/client";
import type { ReadinessContext } from "../state/readinessStore";

export function getLeadIdFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return params.get("lead") || params.get("creditReadinessId");
}

async function fetchReadinessWithRetry(
  url: string,
  fetchImpl: typeof fetch,
  maxAttempts = 2
) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const response = await fetchImpl(url);
      if (response.ok || response.status < 500 || attempt >= maxAttempts) {
        return response;
      }
    } catch (error: unknown) {
      if (attempt >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Unable to fetch readiness context.");
}

export async function fetchReadinessContext(
  leadId: string,
  fetchImpl: typeof fetch = fetch
): Promise<ReadinessContext | null> {
  try {
    const response = await fetchReadinessWithRetry(
      buildApiUrl(`/public/readiness/${leadId}`),
      fetchImpl,
      2
    );
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const readiness = payload?.readiness ?? payload;
    if (!readiness || typeof readiness !== "object") {
      return null;
    }

    return {
      leadId,
      companyName: readiness.companyName,
      fullName: readiness.fullName,
      phone: readiness.phone,
      email: readiness.email,
      industry: readiness.industry,
      yearsInBusiness:
        typeof readiness.yearsInBusiness === "number"
          ? readiness.yearsInBusiness
          : undefined,
      monthlyRevenue:
        typeof readiness.monthlyRevenue === "number"
          ? readiness.monthlyRevenue
          : undefined,
      annualRevenue:
        typeof readiness.annualRevenue === "number"
          ? readiness.annualRevenue
          : undefined,
      arOutstanding:
        typeof readiness.arOutstanding === "number"
          ? readiness.arOutstanding
          : undefined,
      collateral:
        typeof readiness.collateral === "boolean"
          ? readiness.collateral
          : undefined,
    };
  } catch {
    return null;
  }
}
