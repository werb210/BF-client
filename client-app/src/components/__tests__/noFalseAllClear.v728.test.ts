// BF_CLIENT_NO_FALSE_ALL_CLEAR_v728
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("a failed load never looks like nothing to do", () => {
  it("the portal only clears documents on a real server answer", () => {
    const s = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
    expect(s).toContain("if (needed && (Array.isArray(needed.stillNeeded) || Array.isArray(needed.rejected))) {");
    expect(s).not.toContain("} catch {} finally { setDocsChecked(true);");
  });
  it("the upload window does not say all caught up when it failed to load", () => {
    const s = readFileSync("src/components/DocPicker.tsx", "utf8");
    expect(s).toContain("const empty = !loading && !error &&");
  });
  it("the to-do list says it could not load and offers a retry", () => {
    const s = readFileSync("src/components/ActionCenter.tsx", "utf8");
    expect(s).toContain('data-testid="action-center-failed"');
    expect(s).not.toContain("if (failed || !isActionCenter(data)) return null;");
  });
});
