import { apiRequest } from "../lib/api";

export type LeadPayload = {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  source: string;
};

export async function createLead(payload: LeadPayload) {
  return apiRequest("/leads", {
    method: "POST",
    body: payload,
  });
}
