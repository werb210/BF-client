// @ts-nocheck
import { parseCurrencyAmount } from "./productSelection";

export type LenderProductRequirement = {
  id: string;
  document_type: string;
  required: boolean;
  min_amount?: number | null;
  max_amount?: number | null;
};

export function normalizeRequirementList(
  raw: unknown
): LenderProductRequirement[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry: unknown) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (!trimmed) return null;
        return {
          id: trimmed,
          document_type: trimmed,
          required: true,
          min_amount: null,
          max_amount: null,
        } as LenderProductRequirement;
      }
      const documentType =
        typeof entry?.document_type === "string"
          ? entry.document_type.trim()
          : "";
      if (!documentType) return null;
      return {
        id: String(entry?.id ?? documentType),
        document_type: documentType,
        required: Boolean(entry?.required ?? true),
        min_amount:
          typeof entry?.min_amount === "number" ? entry.min_amount : null,
        max_amount:
          typeof entry?.max_amount === "number" ? entry.max_amount : null,
      } as LenderProductRequirement;
    })
    .filter((entry): entry is LenderProductRequirement => Boolean(entry));
}

export function filterRequirementsByAmount(
  requirements: LenderProductRequirement[],
  amountRequested?: string | number | null
) {
  const amount = parseCurrencyAmount(amountRequested ?? 0);
  return requirements.filter((requirement) => {
    if (
      typeof requirement.min_amount === "number" &&
      amount < requirement.min_amount
    ) {
      return false;
    }
    if (
      typeof requirement.max_amount === "number" &&
      amount > requirement.max_amount
    ) {
      return false;
    }
    return true;
  });
}

export function sortRequirements(requirements: LenderProductRequirement[]) {
  return [...requirements].sort((a, b) => {
    if (a.required !== b.required) {
      return a.required ? -1 : 1;
    }
    return a.document_type.localeCompare(b.document_type);
  });
}

export function formatDocumentLabel(value: string) {
  const overrides: Record<string, string> = {
    bank_statements: "6 months bank statements",
    // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — moved from Step 6.
    primary_applicant_id: "Primary applicant photo ID",
    partner_applicant_id: "Business partner photo ID",
  };
  if (overrides[value]) return overrides[value];
  const withSpaces = value.replace(/[_-]+/g, " ").trim();
  if (!withSpaces) return value;
  return withSpaces.replace(/\b\w/g, (char) => char.toUpperCase());
}
