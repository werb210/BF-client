import api from "@/api/client";

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
  const res = await api.get<ClientLender[]>("/api/lenders");
  const { data } = res;
  return Array.isArray(data) ? data : [];
}

export async function getClientLenderProducts(): Promise<ClientLenderProduct[]> {
  const res = await api.get<ClientLenderProduct[]>("/api/client/lender-products");

  const { data } = res;
  return Array.isArray(data) ? data : [];
}


export type RequiredDocsQuery = {
  country?: string;
  product_category?: string;
  funding_amount?: number;
  industry?: string;
  revenue_last_12?: number;
  monthly_revenue?: number;
  years_in_business?: number;
};

export type RequiredDocsResponse = {
  items: string[];
};

export async function getRequiredLenderProductDocs(
  query: RequiredDocsQuery
): Promise<string[]> {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const queryString = search.toString();
  const res = await api.get<RequiredDocsResponse>(
    `/api/portal/lender-products/required-docs${queryString ? `?${queryString}` : ""}`
  );

  const items = res.data?.items;
  return Array.isArray(items)
    ? items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}
