// BF_CLIENT_TEST_CI_WIRING_v446
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

describe("v446 the deploy workflow runs the tests it claims to gate", () => {
  it("the script the deploy workflow calls exists", () => {
    expect(pkg.scripts["test:ci"]).toBeTruthy();
  });

  it("it delegates into client-app, where the 156 components live", () => {
    expect(pkg.scripts["test:ci"]).toContain("--prefix client-app");
  });

  it("no workflow calls a root script that does not exist", () => {
    const dir = path.join(root, ".github/workflows");
    const missing: string[] = [];
    for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
      const yaml = readFileSync(path.join(dir, file), "utf8");
      for (const m of yaml.matchAll(/run:\s*npm run ([a-z0-9:_-]+)/g)) {
        if (!pkg.scripts?.[m[1]]) missing.push(`${file}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("documents why a root vitest run finds nothing", () => {
    // Root vitest.config.ts excludes client-app on purpose; the delegation above
    // is what makes the suite reachable. If that exclude is ever removed, the
    // root run would double-execute every file.
    const config = readFileSync(path.join(root, "vitest.config.ts"), "utf8");
    expect(config).toContain("client-app");
  });
});
