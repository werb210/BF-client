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
// BF_CLIENT_STEP2_COMPARE_v187
// Step 2 listed the ten categories by name and product count only, so an
// applicant had to already know what "Factoring" or "ABL" meant to choose one.
// The description travels on the bucket so the label and the explanation can
// never drift apart, and is written for a borrower rather than a broker.
export const CATEGORY_BUCKETS = [
  { id: "LINE_OF_CREDIT", label: "Line of Credit", aliases: ["LOC"], description: "A revolving limit you draw from and repay as needed. You pay interest only on what you have drawn. Best for uneven cash flow and short-term gaps." },
  { id: "TERM_LOAN", label: "Term Loan", aliases: ["TERM"], description: "One lump sum repaid on a fixed schedule over a set term. Predictable payments. Best for a specific one-time investment or expansion." },
  { id: "EQUIPMENT_FINANCE", label: "Equipment Financing", aliases: ["EQUIPMENT"], description: "Funds the purchase of machinery or vehicles, with the equipment itself as the security. Usually needs a smaller deposit than a general loan." },
  { id: "FACTORING", label: "Factoring", aliases: ["INVOICE_FACTORING"], description: "Sell your unpaid customer invoices for cash now instead of waiting 30 to 90 days. Approval leans on your customers' credit, not only yours." },
  { id: "PURCHASE_ORDER_FINANCE", label: "Purchase Order Financing", aliases: ["PO"], description: "Pays your supplier so you can fill a confirmed customer order you could not otherwise afford. Repaid when your customer pays." },
  { id: "MERCHANT_CASH_ADVANCE", label: "Merchant Cash Advance", aliases: ["MCA"], description: "An advance repaid as a percentage of your daily card sales, so payments flex with revenue. Fast to fund and typically the most expensive option." },
  { id: "MEDIA", label: "Media / Film Financing", aliases: ["MEDIA_FUNDING"], description: "Production funding secured against tax credits, distribution agreements or presales. For film, television and content producers." },
  { id: "ASSET_BASED_LENDING", label: "Asset Based Lending", aliases: ["ABL"], description: "A facility sized against assets you already own, such as receivables, inventory or equipment. Suits asset-heavy businesses wanting a larger limit." },
  { id: "SBA_GOVERNMENT", label: "SBA / Government", aliases: ["SBA"], description: "Government-backed lending with longer terms and lower rates than most private options. More paperwork and a slower approval in exchange." },
  { id: "STARTUP_CAPITAL", label: "Startup Capital", aliases: ["STARTUP"], description: "For businesses with little or no trading history, where approval rests on the owner's profile and the plan rather than past revenue." },
] as const;

export function descriptionFor(bucketId: string): string {
  const bucket = CATEGORY_BUCKETS.find((entry) => entry.id === bucketId);
  return bucket ? bucket.description : "";
}

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
