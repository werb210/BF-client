// BF_CLIENT_AUDIT_v748
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
describe("client audit fixes", () => {
  it("Step 5's SBA guard is its own component, so the document screen's hooks never change order", () => {
    const s = readFileSync("src/wizard/Step5_Documents.tsx", "utf8");
    expect(s).toContain("return <Step5DocumentsBody />;");
    expect(s).toContain("function Step5DocumentsBody() {");
    const outer = s.slice(s.indexOf("export function Step5_Documents()"), s.indexOf("function Step5DocumentsBody()"));
    expect(outer).not.toContain("useState");
  });
  it("Maya calls useAuth at the top level", () => {
    expect(readFileSync("src/components/MayaWidget.tsx", "utf8")).toContain("const { user } = useAuth() as");
  });
  it("lint reads TypeScript and checks the rules of hooks", () => {
    const c = readFileSync(".eslintrc.cjs", "utf8");
    expect(c).toContain('parser: "@typescript-eslint/parser"');
    expect(c).toContain('"react-hooks/rules-of-hooks": "error"');
  });
});
