// BF_CLIENT_INLINE_OTP_CLIENT_v346
// v343 only looked for endpoints.otpVerify, so a raw fetch to the literal path
// on the landing page kept minting staff tokens. This catches every form.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = join(__dirname, "..", "..");
const everySource = (dir: string): string[] =>
  readdirSync(join(src, dir), { withFileTypes: true }).flatMap((e) => {
    if (e.name === "__tests__") return [];
    if (e.isDirectory()) return everySource(join(dir, e.name));
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(dir, e.name)] : [];
  });

describe("every OTP verify request names who is signing in", () => {
  it("covers literal-path fetches as well as endpoints.otpVerify", () => {
    const offenders: string[] = [];
    let found = 0;
    for (const file of everySource(".")) {
      const text = readFileSync(join(src, file), "utf8");
      const calls = text.matchAll(/(?:\/api\/auth\/otp\/verify['`]|endpoints\.otpVerify)[\s\S]{0,600}?body:[^\n]*/g);
      for (const call of calls) {
        found += 1;
        const expected = file.replace(/\\/g, "/").endsWith("api/accountant.ts") ? "accountant" : "client";
        if (!new RegExp(`userType: ['"]${expected}['"]`).test(call[0])) offenders.push(file);
      }
    }
    expect(found).toBeGreaterThanOrEqual(4);
    expect(offenders).toEqual([]);
  });

  it("the landing page sign-in asks for a client token", () => {
    expect(readFileSync(join(src, "components/PhoneOTPInline.tsx"), "utf8"))
      .toContain("body: JSON.stringify({ phone: phoneE164, code, userType: 'client' })");
  });
});
