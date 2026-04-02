export const DOCUMENT_CATEGORIES = [
  "bank_statements",
  "financials",
  "tax_returns",
  "id",
  "invoice_po",
] as const;

const CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  bank_statements: "Bank Statements",
  financials: "Tax & Financials",
  tax_returns: "Tax & Financials",
  id: "Applicant Identification",
  invoice_po: "Transaction Documents",
};

export function resolveDocumentCategory(docType: string) {
  const normalized = docType.toLowerCase();

  if (normalized.includes("bank")) return CATEGORY_LABELS.bank_statements;
  if (normalized.includes("tax") || normalized.includes("financial") || normalized.includes("balance") || normalized.includes("profit") || normalized.includes("loss") || normalized.includes("cash_flow")) {
    return CATEGORY_LABELS.financials;
  }
  if (normalized.includes("id") || normalized.includes("passport") || normalized.includes("license")) {
    return CATEGORY_LABELS.id;
  }
  if (normalized.includes("invoice") || normalized.includes("purchase_order") || normalized.includes("contract") || normalized.includes("equipment") || normalized.includes("lease")) {
    return CATEGORY_LABELS.invoice_po;
  }

  return "Additional Requirements";
}
