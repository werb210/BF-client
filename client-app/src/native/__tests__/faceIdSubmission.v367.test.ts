// BF_CLIENT_FACE_ID_SUBMISSION_v367
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "..", "deviceSignIn.ts"), "utf8");
const renew = src.slice(src.indexOf("export async function renewSessionSilently"));

describe("Face ID lands where a text-code sign-in does", () => {
  it("the silent renewal keeps the server's submitted-application answer", () => {
    expect(renew).toContain("hasSubmittedApplication?: boolean; submittedApplicationId?: string | null");
    expect(renew).toContain("ClientProfileStore.markSubmitted(phone, data.submittedApplicationId);");
    expect(renew).toContain("ClientProfileStore.setLastUsedPhone(phone);");
  });
  it("records it only after the new session is stored", () => {
    expect(renew.indexOf("setToken(data.token);")).toBeLessThan(renew.indexOf("ClientProfileStore.markSubmitted("));
  });
});
