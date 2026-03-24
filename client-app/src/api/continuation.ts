import type { ReadinessContext } from "@/state/readinessStore";
import { fetchWithRetry } from "@/utils/fetchWithRetry";

export interface ContinuationPayload {
  leadId?: string;
  readinessToken?: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  industry?: string;
  yearsInBusiness?: number;
  monthlyRevenue?: number;
  annualRevenue?: number;
  arOutstanding?: number;
  collateral?: boolean;
  years_in_business?: number;
  monthly_revenue?: number;
  annual_revenue?: number;
  ar_outstanding?: number;
}

export interface ReadinessBridgePayload {
  sessionToken?: string;
  leadId?: string;
  readinessLeadId?: string;
  step1?: Record<string, any>;
  step3?: Record<string, any>;
  step4?: Record<string, any>;
}

export interface ContinuationSessionResponse {
  applicationId?: string;
  leadId?: string;
  readinessLeadId?: string;
  email?: string;
  phone?: string;
}


function pickNumber(...values: Array<any>): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function pickBoolean(...values: Array<any>): boolean | undefined {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

export function mapContinuationToReadinessContext(
  payload: ContinuationPayload,
  fallbackLeadId: string
): ReadinessContext {
  return {
    leadId:
      (typeof payload.leadId === "string" && payload.leadId) ||
      fallbackLeadId,
    companyName: payload.companyName,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    industry: payload.industry,
    yearsInBusiness: pickNumber(payload.yearsInBusiness, payload.years_in_business),
    monthlyRevenue: pickNumber(payload.monthlyRevenue, payload.monthly_revenue),
    annualRevenue: pickNumber(payload.annualRevenue, payload.annual_revenue),
    arOutstanding: pickNumber(payload.arOutstanding, payload.ar_outstanding),
    collateral: pickBoolean(payload.collateral),
  };
}

export async function fetchContinuation(token: string): Promise<ContinuationPayload | null> {
  try {
    const res = await fetchWithRetry(`/api/readiness/${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    return (await res.json()) as ContinuationPayload;
  } catch {
    return null;
  }
}

export async function fetchReadinessSession(sessionId: string): Promise<ContinuationPayload | null> {
  try {
    const encodedSessionId = encodeURIComponent(sessionId);
    const primary = await fetchWithRetry(`/api/readiness/${encodedSessionId}`);
    if (primary.ok) {
      return (await primary.json()) as ContinuationPayload;
    }

    if (primary.status >= 500) {
      return null;
    }

    const fallback = await fetchWithRetry(`/api/readiness/continue?sessionId=${encodedSessionId}`);
    if (!fallback.ok) return null;
    return (await fallback.json()) as ContinuationPayload;
  } catch {
    return null;
  }
}

export async function fetchReadinessBridge(
  sessionToken: string
): Promise<ReadinessBridgePayload | null> {
  try {
    const encodedSessionToken = encodeURIComponent(sessionToken);
    const response = await fetchWithRetry(`/api/readiness/continue?token=${encodedSessionToken}`);
    if (!response.ok) return null;
    return (await response.json()) as ReadinessBridgePayload;
  } catch {
    return null;
  }
}

export async function getContinuationSession(): Promise<ContinuationSessionResponse | null> {
  return null;
}
