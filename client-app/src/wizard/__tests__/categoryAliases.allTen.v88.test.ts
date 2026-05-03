import { describe, expect, it } from "vitest";
import { bucketFor, dedupeProductsByBucket, CATEGORY_BUCKETS } from "../categoryAliases";

describe("BF_CLIENT_BLOCK_v88 — every server short code resolves to a bucket", () => {
  const SERVER_SHORT_CODES = ["LOC", "TERM", "EQUIPMENT", "FACTORING", "PO", "MCA", "MEDIA", "ABL", "SBA", "STARTUP"] as const;

  it.each(SERVER_SHORT_CODES)("bucketFor('%s') is non-null", (code) => {
    expect(bucketFor(code)).not.toBeNull();
  });

  it("dedupeProductsByBucket keeps ABL/SBA/STARTUP products that previously vanished", () => {
    const products = [
      { id: "1", category: "ABL", name: "Asset-Based" },
      { id: "2", category: "SBA", name: "SBA 7(a)" },
      { id: "3", category: "STARTUP", name: "Startup Capital" },
    ];
    const grouped = dedupeProductsByBucket(products);
    const bucketIds = grouped.map((g) => g.bucket);
    expect(bucketIds).toContain("ASSET_BASED_LENDING");
    expect(bucketIds).toContain("SBA_GOVERNMENT");
    expect(bucketIds).toContain("STARTUP_CAPITAL");
  });

  it("MEDIA_FUNDING is no longer a separate bucket", () => {
    const ids = CATEGORY_BUCKETS.map((b) => b.id);
    expect(ids).not.toContain("MEDIA_FUNDING");
    expect(ids).toContain("MEDIA");
  });

  it("server MEDIA short code routes to the MEDIA bucket", () => {
    expect(bucketFor("MEDIA")).toBe("MEDIA");
  });

  it("exactly 10 buckets — one per server category", () => {
    expect(CATEGORY_BUCKETS).toHaveLength(10);
  });
});
