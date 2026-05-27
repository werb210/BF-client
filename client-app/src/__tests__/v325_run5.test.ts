// BF_CLIENT_BLOCK_v325_TEST1_RUN5_v1
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const root = path.resolve(__dirname, "..");

describe("v325 — dead ErrorBoundaries removed (R5-#4)", () => {
  const orphans = [
    "components/ErrorBoundary.tsx",
    "components/ClientErrorBoundary.tsx",
    "components/GlobalErrorBoundary.tsx",
    "system/ErrorBoundary.tsx",
  ];
  for (const f of orphans) {
    it(`${f} does not exist`, () => {
      expect(fs.existsSync(path.resolve(root, f))).toBe(false);
    });
  }
  it("the production ErrorBoundary still exists at app/ErrorBoundary.tsx", () => {
    expect(fs.existsSync(path.resolve(root, "app/ErrorBoundary.tsx"))).toBe(true);
  });
});

describe("v325 — Step 1 KYC token log gated to dev (R5-#5)", () => {
  const step1 = fs.readFileSync(path.resolve(root, "wizard/Step1_KYC.tsx"), "utf8");
  it("token log is wrapped in import.meta.env.DEV check", () => {
    expect(step1).toMatch(/if\s*\(\s*import\.meta\.env\.DEV\s*\)\s*\{[\s\S]+applicationToken/);
  });
  it("no bare console.log of applicationToken remains", () => {
    // Bare = not inside the DEV-guarded block. We approximate by
    // checking there's no console.log of applicationToken outside
    // any conditional block — a stricter test would parse the AST,
    // but textual proximity is enough for this regression guard.
    const bareMatches = step1.match(/^\s*console\.log\([^)]*applicationToken/gm) ?? [];
    expect(bareMatches.length).toBe(0);
  });
});
