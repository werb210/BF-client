import type { ClientLenderProduct } from "../api/lenders";
import { getCountryCode, type BusinessLocation } from "../utils/location";

export type ActiveProduct = ClientLenderProduct & { status?: string };
export type LenderGroup = {
  lenderId: string;
  lenderName: string;
  products: ActiveProduct[];
};
export type CategorySummary = {
  category: string;
  totalCount: number;
  matchingCount: number;
  minAmount: number;
  maxAmount: number;
};

export function filterActiveProducts(products: ActiveProduct[]) {
  // BF_CLIENT_BLOCK_v85_STEP2_PRODUCTS_VISIBLE_v1
  // Server filters by active=true server-side and historically did not
  // return a status field. Treat any product reaching the client as
  // active by default; only strip products that EXPLICITLY carry a
  // non-active status string. Without this, every product was filtered
  // out → "No financing products are available for your location"
  // empty state on Step 2 even though the server returned valid products.
  return products.filter((product) => {
    const status = (product.status ?? "").toString().trim().toLowerCase();
    if (!status) return true;
    return status === "active" || status === "live";
  });
}

export function parseCurrencyAmount(value?: string | number | null) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isAmountWithinRange(
  amount: number,
  minAmount?: number | string | null,
  maxAmount?: number | string | null
) {
  if (Number.isNaN(amount) || amount <= 0) return false;
  // BF_CLIENT_BLOCK_v100_AMOUNT_COERCE_v1
  // node-postgres returns NUMERIC columns as strings ("5000", "200000").
  // The previous typeof === "number" guards silently skipped both checks
  // when the API preserved the string form, so v99's amount-fit filter
  // on Step 2's visibleCategoryBuckets had nothing to filter on (MCA
  // still showed for $300k etc.). Coerce string -> number at entry,
  // then range-check with finite-number guards.
  const min = typeof minAmount === "string" ? Number(minAmount) : minAmount;
  const max = typeof maxAmount === "string" ? Number(maxAmount) : maxAmount;
  if (typeof min === "number" && Number.isFinite(min) && amount < min) return false;
  if (typeof max === "number" && Number.isFinite(max) && amount > max) return false;
  return true;
}

export function normalizeCountryCode(value?: string | BusinessLocation | null) {
  if (!value) return "";
  const trimmed = value.toString().trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return getCountryCode(value as BusinessLocation).toUpperCase();
}

export function matchesCountry(
  productCountry: string | undefined,
  applicantCountry: string
) {
  if (!productCountry) return true;
  const normalizedProduct = normalizeCountryCode(productCountry);
  if (!normalizedProduct) return true;
  return normalizedProduct === normalizeCountryCode(applicantCountry);
}

export function filterProductsForApplicant(
  products: ActiveProduct[],
  applicantCountry: string,
  amountRequested: number
) {
  return products.filter((product) => {
    const matchesLocation = matchesCountry(product.country, applicantCountry);
    const matchesAmount = isAmountWithinRange(
      amountRequested,
      product.amount_min,
      product.amount_max
    );
    return matchesLocation && matchesAmount;
  });
}

export function getMatchingProducts(
  products: ActiveProduct[],
  applicantCountry: string,
  amountRequested: number,
  category?: string | null
) {
  const filtered = products.filter((product) =>
    matchesCountry(product.country, applicantCountry)
  );
  return filtered.filter((product) => {
    const matchesAmount = isAmountWithinRange(
      amountRequested,
      product.amount_min,
      product.amount_max
    );
    if (!matchesAmount) return false;
    if (!category) return true;
    const productCategory = product.product_type ?? product.name;
    return productCategory === category;
  });
}

export function buildCategorySummaries(
  products: ActiveProduct[],
  applicantCountry: string,
  amountRequested: number
): CategorySummary[] {
  const relevant = products.filter((product) =>
    matchesCountry(product.country, applicantCountry)
  );
  const grouped = new Map<string, ActiveProduct[]>();
  relevant.forEach((product) => {
    const key = product.product_type ?? product.name;
    const list = grouped.get(key) || [];
    list.push(product);
    grouped.set(key, list);
  });
  return Array.from(grouped.entries())
    .map(([category, list]) => {
      const amounts = list
        .map((product) => ({
          min: product.amount_min ?? 0,
          max: product.amount_max ?? 0,
        }))
        .filter((range) => range.min || range.max);
      const min = Math.min(...amounts.map((range) => range.min || 0));
      const max = Math.max(...amounts.map((range) => range.max || 0));
      const matchingCount = list.filter((product) =>
        isAmountWithinRange(
          amountRequested,
          product.amount_min,
          product.amount_max
        )
      ).length;
      return {
        category,
        totalCount: list.length,
        matchingCount,
        minAmount: Number.isFinite(min) ? min : 0,
        maxAmount: Number.isFinite(max) ? max : 0,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function groupProductsByLender(products: ActiveProduct[]): LenderGroup[] {
  const grouped = new Map<string, LenderGroup>();
  products.forEach((product) => {
    const existing = grouped.get(product.lender_id);
    const lenderName =
      product.lender_name?.trim() || `Lender ${product.lender_id}`;
    const entry = existing || {
      lenderId: product.lender_id,
      lenderName,
      products: [],
    };
    entry.products.push(product);
    grouped.set(product.lender_id, entry);
  });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      products: [...group.products].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }))
    .sort((a, b) => a.lenderName.localeCompare(b.lenderName));
}
