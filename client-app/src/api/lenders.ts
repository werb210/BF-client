import api from "@/api/client";
import type { ApiResponse } from "@/types/api";

export type ClientLender = { id: string; name: string };
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
  status?: string;
};

export type LenderProductRequirement = {
  id: string;
  document_type: string;
  required: boolean;
  min_amount?: number | null;
  max_amount?: number | null;
};

export async function getClientLenders(): Promise<ClientLender[]> {
  const res = await api.get<ApiResponse<ClientLender[]>>("/lenders");
  return res.data.data;
}

export async function getClientLenderProducts(): Promise<ClientLenderProduct[]> {
  const res = await api.get<ApiResponse<ClientLenderProduct[]> | ClientLenderProduct[]>(
    "/lender-products"
  );

  if (Array.isArray(res.data)) {
    return res.data;
  }

  return Array.isArray(res.data.data) ? res.data.data : [];
}
