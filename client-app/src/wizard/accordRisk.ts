// BF_CLIENT_BLOCK_v327 — Accord risk-profile questions + detection, shared so
// Step 3 (Accord branch) and Step 6 (where the questions now render) stay in
// sync and the LOC-detection logic lives in exactly one place.
export const ACCORD_RISK_QUESTIONS = [
  { key: "riskMultipleLocations", label: "Does the business operate more than one location?" },
  { key: "riskBusinessBankruptcy", label: "Has the business ever filed for bankruptcy, CCAA, or a proposal?" },
  { key: "riskOwnerBankruptcyPersonal", label: "Has any owner / officer / director filed personal bankruptcy or a proposal?" },
  { key: "riskOwnerBankruptcyOtherBiz", label: "Has any owner / officer / director filed bankruptcy, CCAA, or a proposal for any other business?" },
  { key: "riskGovtArrears", label: "Any past-due government balances (Source Deductions, GST/HST, PST, income tax, EHT)?" },
] as const;

// BF_CLIENT_BLOCK_v705_ACCORD_MATCH_GATE_v1 — Accord questions show whenever an
// Accord lender product is among the eligible/matched products for this
// application (i.e. Accord is "in the running"), regardless of band. The
// is_accord flag is set server-side and carried through Step 2's matched set
// onto app.eligibleProducts.
export function isAccordLOCApp(app: any): boolean {
  // BF_CLIENT_BLOCK_v863_ACCORD_GATE_SELECTED_LOC — Accord's extended LOC
  // questions (Step 3 fiscal/CRA/economic-impact + risk questions; Step 4 owner
  // detail) apply ONLY when the applicant SELECTED a Line-of-Credit product.
  // eligibleProducts is the full cross-category match set (it feeds Step 2's
  // category list), so for any CA applicant under $1M it routinely contains an
  // Accord LOC product even when they chose TERM / EQUIPMENT. Gating on the
  // eligible set alone (the prior v705 behaviour) leaked these questions onto
  // non-LOC applications.
  const selected = String(app?.productCategory ?? app?.selectedProductType ?? "").toUpperCase();
  const selectedIsLOC =
    selected === "LOC" ||
    selected === "LINE_OF_CREDIT" ||
    selected.includes("LINE OF CREDIT");
  if (!selectedIsLOC) return false;
  const products = Array.isArray(app?.eligibleProducts) ? app.eligibleProducts : [];
  return products.some((product: any) => product?.isAccord === true);
}
