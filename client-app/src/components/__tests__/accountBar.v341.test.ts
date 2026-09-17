// BF_CLIENT_ACCOUNT_BAR_v341
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(src, p), "utf8");
const guard = read("auth/RequireOTP.tsx");
const bar = read("components/AccountBar.tsx");
const portal = read("pages/MiniPortalPage.tsx");
const device = read("native/deviceSignIn.ts");

describe("the Face ID control is at the top, on every signed-in screen", () => {
  it("renders from the guard that wraps every signed-in route", () => {
    expect(guard).toContain("<AccountBar />");
  });

  it("carries the Face ID row", () => {
    expect(bar).toContain("<FaceIdSignInToggle />");
  });

  it("does not leave a second copy buried in the mini-portal panel", () => {
    expect(portal).not.toContain("<FaceIdSignInToggle />");
  });

  it("still redirects to OTP when there is no token", () => {
    expect(guard).toContain('return <Navigate to="/otp" replace />;');
  });
});

describe("a refused enrollment names the session it actually has", () => {
  it("reads the role claim out of the token the app is sending", () => {
    expect(device).toContain("export function roleFromToken(token: string | null): string | null {");
    expect(device).toContain('typeof payload.role === "string"');
  });

  it("puts that role in the message instead of asserting what went wrong", () => {
    expect(device).toContain("const role = roleFromToken(getToken());");
    expect(device).toContain('is a "${role}" session, not a client one.');
  });

  it("says nothing about the role when the token cannot be read", () => {
    expect(device).toContain('const detail = role ? ');
  });
});
