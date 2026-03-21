import api from "@/api/client";
import { API_CONTRACT } from "@/contracts";

export type LeadPayload = {
  companyName?: string;
  fullName: string;
  email: string;
  phone: string;

  yearsInBusiness?: string;
  annualRevenue?: string;
  monthlyRevenue?: string;
  requestedAmount?: string;
  creditScoreRange?: string;

  productInterest?: string;
  industryInterest?: string;

  source: string;
};

export async function createLead(payload: LeadPayload) {
  return api.post(API_CONTRACT.CRM.LEADS, payload);
}
