// @ts-nocheck
import { DOCUMENT_CATEGORIES } from "@/constants/documentCategories";
import type { NormalizedLenderProduct } from "../lender/eligibility";
import type { LenderProductRequirement } from "../wizard/requirements";
import { filterRequirementsByAmount, normalizeRequirementList } from "../wizard/requirements";

type RequirementSource =
  | NormalizedLenderProduct
  | {
      requiredDocs?: string[];
      required_documents?: unknown;
      product_type?: string;
      name?: string;
      category?: string;
    };

export function aggregateRequiredDocuments(
  products: RequirementSource[],
  selectedCategory: string,
  amountRequested?: string | number | null
) {
  const docMap = new Map<string, LenderProductRequirement>();
  const categoryNormalized = selectedCategory?.trim();

  const filtered = categoryNormalized
    ? products.filter((product) => {
        const category =
          (product as NormalizedLenderProduct).category ||
          (product as unknown).product_type ||
          (product as unknown).name ||
          "";
        return category === categoryNormalized;
      })
    : products;

  filtered.forEach((product) => {
    const rawDocs =
      (product as NormalizedLenderProduct).requiredDocs ||
      (product as unknown).required_documents ||
      [];
    const normalized = normalizeRequirementList(rawDocs);
    const applicable = filterRequirementsByAmount(
      normalized,
      amountRequested ?? 0
    );
    applicable.forEach((entry) => {
      const existing = docMap.get(entry.document_type);
      docMap.set(entry.document_type, {
        ...existing,
        ...entry,
        required: Boolean(existing?.required || entry.required),
      });
    });
  });

  // BF_CLIENT_BLOCK_v102_MEDIA_NO_GLOBAL_DOCS_v1
  // Thread category through so MEDIA can opt out of the global
  // always-required docs (bank statements + photo ID). MEDIA is the
  // only category where the lender-product list is the complete and
  // exclusive doc set per Todd's spec.
  return ensureAlwaysRequiredDocuments(Array.from(docMap.values()), {
    category: selectedCategory,
  });
}

// BF_CLIENT_BLOCK_v158_WIZARD_LIVE_FORMAT_OWN100_DEFER_DEDUP_v1
export function ensureAlwaysRequiredDocuments(
  requirements: LenderProductRequirement[],
  // BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1
  // The server's /api/portal/lender-products/required-docs route is now the
  // SINGLE source of truth for required documents. The portal's create-product
  // form (BF-portal/src/pages/lenders/LendersPage.tsx) lets the operator pick
  // every required doc per lender product (always-required + core + conditional).
  // The previous hardcoded snake_case appendage ("bank_statements",
  // "primary_applicant_id", "partner_applicant_id") collided with the server's
  // human-readable canonical strings ("6 months business banking statements",
  // "2 pieces of Government Issued ID") on the dedup map keyed by exact
  // document_type — they never collapsed, so Step 5 rendered duplicate tiles
  // and the submit gate (getMissingRequiredDocs) blocked on whichever key the
  // user hadn't uploaded against. opts is kept in the signature for back-compat
  // with the cache + Step5 callers; both args are ignored.
  _opts: { hasPartner?: boolean; category?: string } = {}
) {
  return [...requirements];
}

export function mergeRequirementLists(
  ...lists: LenderProductRequirement[][]
) {
  const docMap = new Map<string, LenderProductRequirement>();
  lists.flat().forEach((entry) => {
    const existing = docMap.get(entry.document_type);
    docMap.set(entry.document_type, {
      ...existing,
      ...entry,
      required: Boolean(existing?.required || entry.required),
    });
  });
  return Array.from(docMap.values());
}
