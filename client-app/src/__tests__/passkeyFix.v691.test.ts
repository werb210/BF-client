// BF_CLIENT_PASSKEY_FIX_v691
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("passkeys use BF-Server's real routes and remember an existing passkey", () => {
  const lib = readFileSync("src/auth/passkeys.ts", "utf8");
  const bar = readFileSync("src/components/PasskeySignInToggle.tsx", "utf8");
  it("calls /register/* and /login/*", () => {
    for (const p of ["/api/client/passkeys/register/options", "/api/client/passkeys/register/verify", "/api/client/passkeys/login/options", "/api/client/passkeys/login/verify"]) expect(lib).toContain(p);
    expect(lib).not.toMatch(/passkeys\/(registration|authentication)\//);
  });
  it("shows Ready after a refresh when a passkey exists, and treats 'already has one' as Ready", () => {
    expect(lib).toContain('apiRequest<{ passkeys?: unknown[] }>("/api/client/passkeys", { method: "GET" })');
    expect(bar).toContain("void hasPasskey().then((yes) => { if (live && yes) setCreated(true); });");
    expect(lib).toContain('error.name === "InvalidStateError"');
  });
});
