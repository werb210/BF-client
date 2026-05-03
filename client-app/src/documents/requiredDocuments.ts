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

export function ensureAlwaysRequiredDocuments(
  requirements: LenderProductRequirement[],
  // BF_CLIENT_WIZARD_STEP5_PHOTOIDS_v60 — opts.hasPartner controls
  // whether the partner photo ID requirement is included. The primary
  // applicant photo ID is always required. Both move from Step 6 to
  // Step 5 so they participate in the existing "Supply Documents
  // Later" deferral flow.
  // BF_CLIENT_BLOCK_v102_MEDIA_NO_GLOBAL_DOCS_v1
  // opts.category lets the caller signal MEDIA / Film Finance so we
  // skip the global appendage. For MEDIA the per-product list (Budget,
  // Finance plan, Tax credit status, Production schedule, Minimum
  // guarantees / presales) is the complete required set — no bank
  // statements, no photo ID.
  opts: { hasPartner?: boolean; category?: string } = {}
) {
  const isMedia =
    String(opts.category ?? "").trim().toUpperCase() === "MEDIA";
  if (isMedia) {
    // Return the lender-product list unchanged. No global appendage.
    return [...requirements];
  }

  const docMap = new Map(
    requirements.map((entry) => [entry.document_type, entry])
  );
  const alwaysRequired: string[] = [
    DOCUMENT_CATEGORIES.BANK_STATEMENTS,
    "primary_applicant_id",
  ];
  if (opts.hasPartner) {
    alwaysRequired.push("partner_applicant_id");
  }
  alwaysRequired.forEach((docType) => {
    const existing = docMap.get(docType);
    docMap.set(docType, {
      id: existing?.id ?? docType,
      document_type: docType,
      required: true,
      min_amount: existing?.min_amount ?? null,
      max_amount: existing?.max_amount ?? null,
    });
  });
  return Array.from(docMap.values());
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
