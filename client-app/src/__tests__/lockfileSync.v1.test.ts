// BF_CLIENT_ROUTER_LOCKFILE_REVERT_v1
// A dependency range that the root lockfile cannot satisfy fails `npm ci` in CI
// but not in any local `npm install` flow, so it merges green and breaks main.
// This catches the drift at test time instead.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(process.cwd(), "..", "package-lock.json"), "utf8"));

function satisfiesCaret(range: string, version: string): boolean {
  if (!range.startsWith("^")) return true;
  const want = range.slice(1).split(".").map(Number);
  const got = version.split(".").map(Number);
  if (want[0] !== got[0]) return false;
  if (got[1] !== want[1]) return got[1] > want[1];
  return got[2] >= want[2];
}

describe("lockfile satisfies declared ranges", () => {
  it("every dependency range is resolvable from the root lockfile", () => {
    const unmet: string[] = [];
    for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
      if (typeof range !== "string" || !range.startsWith("^")) continue;
      const entry = lock.packages?.[`node_modules/${name}`];
      if (!entry?.version) {
        unmet.push(`${name}: absent from lockfile (declared ${range})`);
        continue;
      }
      if (!satisfiesCaret(range, entry.version)) {
        unmet.push(`${name}: lockfile has ${entry.version}, package.json wants ${range}`);
      }
    }
    expect(unmet).toEqual([]);
  });
});
