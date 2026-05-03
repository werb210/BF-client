// BF_CLIENT_BLOCK_v98_STEP2_BUCKET_BY_CATEGORY_v1
import { describe, expect, it } from "vitest";
import { dedupeProductsByBucket, bucketFor } from "../categoryAliases";

describe("v98 Step 2 buckets products by short-form category", () => {
  it("buckets a product whose name doesn't match any bucket but whose category does", () => {
    const out = dedupeProductsByBucket([
      { id: "p1", name: "Business Line of Credit", category: "LOC", lender_id: "x" } as any,
      { id: "p2", name: "Todd's Term loan", category: "TERM", lender_id: "x" } as any,
      { id: "p3", name: "Todd's PO Financing", category: "PO", lender_id: "x" } as any,
    ]);
    const bucketIds = out.map((b) => b.bucket).sort();
    expect(bucketIds).toEqual(["LINE_OF_CREDIT", "PURCHASE_ORDER_FINANCE", "TERM_LOAN"]);
  });

  it("regression: with category present, named products no longer fall through to name-based bucketing", () => {
    expect(bucketFor("LOC")).toBe("LINE_OF_CREDIT");
    expect(bucketFor("TERM")).toBe("TERM_LOAN");
    expect(bucketFor("PO")).toBe("PURCHASE_ORDER_FINANCE");
    expect(bucketFor("MCA")).toBe("MERCHANT_CASH_ADVANCE");
    expect(bucketFor("MEDIA")).toBe("MEDIA");
    // These are what the user's products' names normalize to —
    // they should NOT be relied on for bucketing.
    expect(bucketFor("Business Line of Credit")).toBe(null);
    expect(bucketFor("Todd's Term loan")).toBe(null);
    expect(bucketFor("Todd's Media Funding")).toBe(null);
  });
});
