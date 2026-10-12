import api from "@/api/client";

// BF_CLIENT_v789_DEAD_CODE - getClientLenders called the staff-only /api/lenders
// (401 for a client) and getRequiredLenderProductDocs duplicated
// api/lenderProducts; neither had a caller. Clients read the public
// /api/client/lender-products catalogue only.
export type ClientLenderProduct = {
  id: string;
  name: string;
  product_type?: string;
  country: string;
  amount_min: number | null;
  amount_max: number | null;
  term?: string | number | null;
  rate?: number | string | null;
  required_documents?: unknown[];
  lender_id: string;
  lender_name?: string;
  is_accord?: boolean;
  status?: string;
  // BF_CREDIT_BAND_v36 - the server sends either spelling.
  min_credit_score?: number | string | null;
  minCreditScore?: number | string | null;
};

export type LenderProductRequirement = {
  id: string;
  document_type: string;
  required: boolean;
  min_amount?: number | null;
  max_amount?: number | null;
};

export async function getClientLenderProducts(country?: string): Promise<ClientLenderProduct[]> {
  // BF_CLIENT_BLOCK_v329 — pass applicant country so the server gates products by
  // geography (Canadian applicants no longer see US-only lenders).
  const qs = country && country.trim() ? `?country=${encodeURIComponent(country.trim())}` : "";
  const res = await api.get<ClientLenderProduct[]>(`/api/client/lender-products${qs}`);

  const { data } = res;
  return Array.isArray(data) ? data : [];
}
