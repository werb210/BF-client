// BF_CLIENT_BLOCK_v107_DOC_REQUIREMENTS_SHAPE_FIX_v1
// (replaces v106, which returned string[] — incompatible with submit gate)
import api from "@/api/client";
import type { LenderProductRequirement } from "@/wizard/requirements";

export type DocRequirementsQuery = {
  country?: string;
  product_category?: string;
  funding_amount?: number;
  industry?: string;
  revenue_last_12?: number;
  monthly_revenue?: number;
  years_in_business?: number;
};

type ServerItem = {
  id?: string;
  document_type?: string;
  required?: boolean;
  min_amount?: number | null;
  max_amount?: number | null;
};

export async function fetchRequiredDocsUnion(
  q: DocRequirementsQuery
): Promise<LenderProductRequirement[]> {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });

  try {
    const res = await api.get<{ items?: ServerItem[] }>(
      `/api/portal/lender-products/required-docs?${params.toString()}`
    );
    const items = Array.isArray(res?.data?.items) ? res!.data!.items! : [];
    return items
      .filter((e): e is ServerItem & { document_type: string } =>
        Boolean(e && typeof e.document_type === "string" && e.document_type)
      )
      .map<LenderProductRequirement>((e) => ({
        id: e.id ?? `req:${e.document_type}`,
        document_type: e.document_type,
        required: e.required !== false,
        min_amount: e.min_amount ?? null,
        max_amount: e.max_amount ?? null,
      }));
  } catch {
    return [];
  }
}
