// BF_CLIENT_v71_BLOCK_3_4
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function findSubmitFile(): string {
  const root = path.resolve(__dirname, "..", "..", "..", "..");
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        if (f.name === "node_modules" || f.name.startsWith(".")) continue;
        out.push(...walk(full));
      } else if (/\.(ts|tsx)$/.test(f.name)) {
        out.push(full);
      }
    }
    return out;
  }
  const files = walk(path.join(root, "src"));
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    if (/applications\/[^"'`]+\/submit/.test(t)) return f;
  }
  return "";
}

describe("submit wiring", () => {
  it("submit file references the BF_CLIENT_v71_BLOCK_3_4 sentinel", () => {
    const f = findSubmitFile();
    expect(f).not.toBe("");
    const t = fs.readFileSync(f, "utf8");
    expect(t).toContain("BF_CLIENT_v71_BLOCK_3_4");
  });
});
