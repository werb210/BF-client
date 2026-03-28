import { apiClient } from "@/api/client";

export interface CreditPrefill {
  companyName: string;
  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  availableCollateral: string;
  fullName: string;
  email: string;
  phone: string;
}

export async function fetchPrefill(token: string): Promise<CreditPrefill | null> {
  try {
    const res = await apiClient.post<CreditPrefill>("/prefill/validate", { token });
    const { data } = res;
    return data || null;
  } catch {
    return null;
  }
}
