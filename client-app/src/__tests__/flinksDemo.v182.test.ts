// BF_CLIENT_FLINKS_v182 - the last off-brand stylesheet in this app.
import { describe, it, expect } from "vitest";
import fs from "fs";

const CSS = fs.readFileSync("src/pages/FlinksDemoPage.css", "utf8");

describe("the demo page is on brand", () => {
  it("dropped the generic neutrals", () => {
    for (const stale of ["#0f172a", "#334155", "#475569", "#64748b", "#e5e7eb", "#d1d5db"]) {
      expect(CSS).not.toContain(stale);
    }
  });

  it("uses navy, body and the brand hairline", () => {
    expect(CSS).toContain("#0B1F3A");
    expect(CSS).toContain("#51617D");
    expect(CSS).toContain("#E4EAF2");
  });
});

describe("semantic panels survive", () => {
  it("keeps the success green pair", () => {
    expect(CSS).toContain("#16a34a");
    expect(CSS).toContain("#e9f8ef");
  });

  it("keeps the warning amber pair", () => {
    expect(CSS).toContain("#d97706");
    expect(CSS).toContain("#fef3e2");
  });
});
