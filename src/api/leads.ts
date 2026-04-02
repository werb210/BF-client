import { api } from '@/lib/api';

export type LeadPayload = {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  source: string;
};

export async function createLead(payload: LeadPayload) {
  return api.post('/leads', payload);
}
