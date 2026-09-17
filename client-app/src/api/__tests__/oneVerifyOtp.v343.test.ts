// BF_CLIENT_ONE_VERIFY_OTP_v343
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = join(__dirname, "..", "..");

const everySource = (dir: string): string[] =>
  readdirSync(join(src, dir), { withFileTypes: true }).flatMap((e) => {
    if (e.name === "__tests__") return [];
    if (e.isDirectory()) return everySource(join(dir, e.name));
    return e.name.endsWith(".ts") || e.name.endsWith(".tsx") ? [join(dir, e.name)] : [];
  });

describe("every OTP verify declares itself as a client sign-in", () => {
  it("finds them all, however many there are", () => {
    // Two existed and only one was fixed. Whichever the OTP page imported
    // decided whether the client app got a client token or a staff one, and
    // nothing in the app made that visible.
    const offenders: string[] = [];
    let found = 0;
    for (const file of everySource(".")) {
      const text = readFileSync(join(src, file), "utf8");
      for (const call of text.matchAll(/endpoints\.otpVerify[\s\S]{0,300}?\}\)/g)) {
        found += 1;
        if (!call[0].includes('userType: "client"')) offenders.push(file);
      }
    }
    expect(found).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("both known call sites carry it", () => {
    expect(readFileSync(join(src, "api/client.ts"), "utf8")).toContain('body: { phone, code, userType: "client" }');
    expect(readFileSync(join(src, "api/auth.ts"), "utf8")).toContain('userType: "client"');
  });
});
