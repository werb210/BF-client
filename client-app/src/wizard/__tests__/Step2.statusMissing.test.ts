import { describe, expect, it } from "vitest";
import { filterActiveProducts } from "../productSelection";
import { getCountryCode } from "../../utils/location";

describe("BF_CLIENT_BLOCK_v85 — filterActiveProducts", () => {
  it("keeps products with no status field (server omits it; already filtered active=true)", () => {
    const products = [
      { id: "1", name: "Equipment Finance" },
      { id: "2", name: "Term Loan", status: undefined },
      { id: "3", name: "LOC", status: null },
      { id: "4", name: "Factoring", status: "" },
    ] as any[];
    expect(filterActiveProducts(products)).toHaveLength(4);
  });

  it("keeps explicit active/live (case-insensitive)", () => {
    const products = [
      { id: "1", status: "active" },
      { id: "2", status: "ACTIVE" },
      { id: "3", status: "Live" },
    ] as any[];
    expect(filterActiveProducts(products)).toHaveLength(3);
  });

  it("strips explicit inactive/draft/archived", () => {
    const products = [
      { id: "1", status: "inactive" },
      { id: "2", status: "draft" },
      { id: "3", status: "archived" },
      { id: "4", status: "deleted" },
    ] as any[];
    expect(filterActiveProducts(products)).toHaveLength(0);
  });
});

describe("BF_CLIENT_BLOCK_v85 — getCountryCode", () => {
  it("returns empty string for unknown locations (matchesCountry then matches anything)", () => {
    expect(getCountryCode(undefined)).toBe("");
    expect(getCountryCode("")).toBe("");
    expect(getCountryCode("Mars")).toBe("");
  });

  it("still maps Canada and United States explicitly", () => {
    expect(getCountryCode("Canada")).toBe("CA");
    expect(getCountryCode("United States")).toBe("US");
  });
});
