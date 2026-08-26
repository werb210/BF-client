// BF_CLIENT_STEP1_PRODUCTSYNC_v207
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const step1 = readFileSync(resolve(__dirname, "..", "Step1_KYC.tsx"), "utf-8");
const step5 = readFileSync(resolve(__dirname, "..", "Step5_Documents.tsx"), "utf-8");
const selection = readFileSync(resolve(__dirname, "..", "productSelection.ts"), "utf-8");

describe("ProductSync import", () => {
  it("imports from the module that actually exports it", () => {
    expect(existsSync(resolve(__dirname, "..", "..", "lender", "productSync.ts"))).toBe(true);
    expect(step1).toContain('await import("../lender/productSync")');
  });
  it("no longer reaches for it on productSelection", () => {
    expect(selection).not.toContain("ProductSync");
    expect(step1).not.toContain('import("./productSelection")');
  });
  it("agrees with every other caller in the app", () => {
    expect(step5).toContain('from "../lender/productSync"');
  });
  it("falls back to sync() when the cache is cold", () => {
    expect(step1).toContain("await ProductSync.sync()");
  });
  it("logs instead of swallowing the failure", () => {
    expect(step1).toContain("[step1] lender product panel unavailable");
    expect(step1).not.toContain("} catch { /* ignore */ }");
  });
  it("carries no stale v206 explanation", () => {
    expect(step1).not.toContain("BF_CLIENT_STEP1_PRODUCTSYNC_IMPORT_v206");
    expect(step1).not.toContain("The dynamic import therefore threw");
  });
});
