// BF_CLIENT_BLOCK_v327 — Accord risk-profile questions + detection, shared so
// Step 3 (Accord branch) and Step 6 (where the questions now render) stay in
// sync and the LOC-detection logic lives in exactly one place.
import { bucketFor } from "./categoryAliases";
import { parseCurrencyAmount } from "./productSelection";
import { getCountryCode } from "../utils/location";

export const ACCORD_RISK_QUESTIONS = [
  { key: "riskMultipleLocations", label: "Does the business operate more than one location?" },
  { key: "riskBusinessBankruptcy", label: "Has the business ever filed for bankruptcy, CCAA, or a proposal?" },
  { key: "riskOwnerBankruptcyPersonal", label: "Has any owner / officer / director filed personal bankruptcy or a proposal?" },
  { key: "riskOwnerBankruptcyOtherBiz", label: "Has any owner / officer / director filed bankruptcy, CCAA, or a proposal for any other business?" },
  { key: "riskGovtArrears", label: "Any past-due government balances (Source Deductions, GST/HST, PST, income tax, EHT)?" },
] as const;

// Accord LOC = Line of Credit + Canada + funding under $1,000,000.
export function isAccordLOCApp(app: any): boolean {
  const country = getCountryCode(app?.kyc?.businessLocation);
  const amount = parseCurrencyAmount(app?.kyc?.fundingAmount);
  return (
    bucketFor(String(app?.productCategory ?? app?.selectedProductType ?? "")) === "LINE_OF_CREDIT" &&
    country === "CA" &&
    amount > 0 &&
    amount < 1_000_000
  );
}
