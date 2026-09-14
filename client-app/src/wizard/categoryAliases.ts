// Map every server-recognised category code to a display bucket.
// One bucket per row; legacy short codes fold into the long form.

// BF_CLIENT_BLOCK_v88_ALL_TEN_CATEGORIES_ALIASES_v1
// Aligned to BF-Server's 10 normalized short codes:
//   LOC, TERM, EQUIPMENT, FACTORING, PO, MCA, MEDIA, ABL, SBA, STARTUP
// Each bucket's `aliases` array MUST contain the server short code
// for that category. Without this, dedupeProductsByBucket() drops
// every product that arrives with a short-code category and Step 2
// shows fewer products than the server actually returns.
//
// Removed: MEDIA_FUNDING bucket (was aliased to "MCA", which is a
// different category; the canonical MEDIA bucket below absorbs all
// media-funding products correctly).
export const CATEGORY_BUCKETS = [
  { id: "LINE_OF_CREDIT", label: "Line of Credit", aliases: ["LOC"] },
  { id: "TERM_LOAN", label: "Term Loan", aliases: ["TERM"] },
  { id: "EQUIPMENT_FINANCE", label: "Equipment Financing", aliases: ["EQUIPMENT"] },
  { id: "FACTORING", label: "Factoring", aliases: ["INVOICE_FACTORING"] },
  { id: "PURCHASE_ORDER_FINANCE", label: "Purchase Order Financing", aliases: ["PO"] },
  { id: "MERCHANT_CASH_ADVANCE", label: "Merchant Cash Advance", aliases: ["MCA"] },
  { id: "MEDIA", label: "Media / Film Financing", aliases: ["MEDIA_FUNDING"] },
  { id: "ASSET_BASED_LENDING", label: "Asset Based Lending", aliases: ["ABL"] },
  { id: "SBA_GOVERNMENT", label: "SBA / Government", aliases: ["SBA"] },
  { id: "STARTUP_CAPITAL", label: "Startup Capital", aliases: ["STARTUP"] },
] as const;

export type BucketId = (typeof CATEGORY_BUCKETS)[number]["id"];

function normalizeCategory(rawCategory: string): string {
  return rawCategory
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/\//g, "_")
    .replace(/__+/g, "_");
}

export function bucketFor(rawCategory: string): BucketId | null {
  const upper = normalizeCategory(rawCategory);
  for (const bucket of CATEGORY_BUCKETS) {
    if (bucket.id === upper) return bucket.id;
    if ((bucket.aliases as readonly string[]).includes(upper)) return bucket.id;
    if (normalizeCategory(bucket.label) === upper) return bucket.id;
  }
  return null;
}

export function dedupeProductsByBucket<T extends { category: string }>(products: T[]): Array<{
  bucket: BucketId;
  label: string;
  products: T[];
}> {
  const out = new Map<BucketId, T[]>();
  for (const product of products) {
    const bucket = bucketFor(product.category);
    if (!bucket) continue;
    const existing = out.get(bucket) ?? [];
    existing.push(product);
    out.set(bucket, existing);
  }

  return CATEGORY_BUCKETS
    .filter((bucket) => out.has(bucket.id))
    .map((bucket) => ({ bucket: bucket.id, label: bucket.label, products: out.get(bucket.id)! }));
}
