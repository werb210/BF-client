// @ts-nocheck
import type { LenderProduct as BaseLenderProduct } from "./mockProducts";

interface LenderProduct extends BaseLenderProduct {
  category: string;
  supportedCountries: string[];
  minAmount: number;
  maxAmount: number;
  // BF_CREDIT_BAND_v36
  minCreditScore?: number | null;
  min_credit_score?: number | null;
}

function getMinCreditScore(product: LenderProduct): number | null {
  // BF_CREDIT_BAND_v36
  if (product.minCreditScore != null) return Number(product.minCreditScore);
  if (product.min_credit_score != null) return Number(product.min_credit_score);
  return null;
}

export function compileQuestions(products: LenderProduct[]) {
  const business = new Set<string>();
  const applicant = new Set<string>();

  products.forEach((p) => {
    p.businessQuestions.forEach((q) => business.add(q));
    p.applicantQuestions.forEach((q) => applicant.add(q));
  });

  return {
    businessQuestions: Array.from(business),
    applicantQuestions: Array.from(applicant),
  };
}

export function compileDocs(products: LenderProduct[]) {
  const docs = new Set<string>();
  products.forEach((p) => p.requiredDocs.forEach((d) => docs.add(d)));
  return Array.from(docs);
}

export function filterProductsForCategory(all: LenderProduct[], category: string) {
  return all.filter((p) => p.category === category);
}

export function filterProductsForEligibility(all: LenderProduct[], kyc: unknown) {
  return all.filter((p) => {
    const minCreditScore = getMinCreditScore(p);
    if (!p.supportedCountries?.includes(kyc.country)) return false;
    if (kyc.amount < p.minAmount) return false;
    if (kyc.amount > p.maxAmount) return false;
    if (
      minCreditScore != null &&
      typeof kyc.creditScoreUpperBound === "number" &&
      kyc.creditScoreUpperBound < minCreditScore
    ) {
      return false;
    }
    if (p.category === "Factoring" && !(kyc.accountsReceivableBalance > 0)) {
      return false;
    }
    return true;
  });
}
