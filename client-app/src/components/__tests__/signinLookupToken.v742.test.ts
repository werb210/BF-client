// BF_CLIENT_SIGNIN_LOOKUP_TOKEN_v742
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/PhoneOTPInline.tsx", "utf8");

describe("after sign-in, the existing-application lookup is sent with the real token", () => {
  it("reads the token through getToken(), not the old auth_token key that setToken() deletes", () => {
    expect(src).toContain("Authorization: 'Bearer ' + (getToken() ?? '')");
    expect(src).not.toContain("localStorage.getItem('auth_token')");
  });
  it("still looks before making a new application", () => {
    expect(src.indexOf("/api/client/applications/by-phone")).toBeGreaterThan(0);
    expect(src.indexOf("/api/client/applications/by-phone")).toBeLessThan(src.indexOf("// 2. Mint the application row."));
  });
});
