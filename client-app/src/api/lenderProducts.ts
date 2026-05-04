// BF_CLIENT_BLOCK_v106_DOC_REQUIREMENTS_UNION_v1
import api from "@/api/client";

export type DocRequirementsQuery = {
  country?: string;
  product_category?: string;
  funding_amount?: number;
  industry?: string;
  revenue_last_12?: number;
  monthly_revenue?: number;
  years_in_business?: number;
};

export async function fetchRequiredDocsUnion(q: DocRequirementsQuery): Promise<string[]> {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });

  try {
    const res = await api.get<{ items?: string[] }>(
      `/api/portal/lender-products/required-docs?${params.toString()}`
    );
    return Array.isArray(res?.data?.items) ? res.data.items : [];
  } catch {
    return [];
  }
}
