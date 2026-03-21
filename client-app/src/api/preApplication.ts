import { apiRequest } from "@/api/client";
import { API_CONTRACT } from "@/contracts";

type PreApplicationLookupResponse = {
  token: string;
  companyName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  annualRevenue?: string;
  requestedAmount?: string | number;
  yearsInBusiness?: string;
};

export async function lookupPreApplication(
  email: string
): Promise<PreApplicationLookupResponse | null> {
  return (apiRequest(
    `${API_CONTRACT.PREAPP.LOOKUP}?email=${encodeURIComponent(email)}`
  ) as Promise<PreApplicationLookupResponse>).catch((): null => null);
}

export async function consumePreApplication(token: string): Promise<any> {
  return apiRequest(API_CONTRACT.PREAPP.CONSUME, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
