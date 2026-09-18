// BF_CLIENT_SIGN_OUT_v345
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const src = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(src, p), "utf8");
const bar = read("components/AccountBar.tsx");

const everySource = (dir: string): string[] =>
  readdirSync(join(src, dir), { withFileTypes: true }).flatMap((e) => {
    if (e.name === "__tests__") return [];
    if (e.isDirectory()) return everySource(join(dir, e.name));
    return e.name.endsWith(".tsx") ? [join(dir, e.name)] : [];
  });

describe("a client can end their session", () => {
  it("offers sign out on every signed-in screen", () => {
    // It lives in AccountBar, which RequireOTP renders above every guarded route.
    expect(bar).toContain("Sign out");
    expect(bar).toContain("clearToken();");
    expect(bar).toContain('navigate("/otp", { replace: true });');
  });

  it("revokes this device's Face ID credential too", () => {
    // Otherwise the next person taps "Sign in with Face ID" and is back inside
    // the account that just signed out.
    expect(bar).toContain("disableDeviceSignIn()");
  });

  it("never lets a failed revoke keep someone signed in", () => {
    const order = bar.indexOf("disableDeviceSignIn()");
    const cleared = bar.indexOf("clearToken();");
    expect(order).toBeGreaterThan(-1);
    expect(cleared).toBeGreaterThan(order);
    expect(bar).toContain(".catch(() => undefined)");
  });

  it("is reachable from somewhere a client actually goes", () => {
    const guard = read("auth/RequireOTP.tsx");
    expect(guard).toContain("<AccountBar />");
  });

  it("stays the only sign-out, so a second one cannot drift out of step", () => {
    // AccountantPage has a separate accountant login and session; this assertion
    // deliberately covers only the client application's sign-out implementation.
    const owners = everySource(".").filter((f) => f !== "pages/AccountantPage.tsx").filter((f) => readFileSync(join(src, f), "utf8").includes(">Sign out<") || readFileSync(join(src, f), "utf8").includes("Signing out…"));
    expect(owners).toEqual(["components/AccountBar.tsx"]);
  });
});
