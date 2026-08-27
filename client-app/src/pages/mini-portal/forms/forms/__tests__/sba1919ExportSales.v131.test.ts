// BF_CLIENT_EXPORT_SALES_v131
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const form = readFileSync(resolve(__dirname, "..", "Sba1919Form.tsx"), "utf-8");

describe("question 5 collects both sub-parts", () => {
  it("asks for the dollar amount the server writes to 5.a", () => {
    expect(form).toContain('set("q5_export_sales"');
    expect(form).toContain("Estimated total export sales");
  });

  it("asks for countries separately, in their own field", () => {
    expect(form).toContain('set("q5_exports_detail"');
    expect(form).toContain("Principal countries of export");
  });

  it("does not route question 5 through the generic detail box", () => {
    expect(form).toContain('q.key !== "q5_exports" && <textarea');
  });

  it("leaves every other question on the generic detail box", () => {
    expect(form).toContain('data[`${q.key}_detail`]');
  });

  it("only shows the sub-parts when the answer is yes", () => {
    expect(form).toContain('data[q.key] === "yes" && q.key === "q5_exports"');
  });
});
