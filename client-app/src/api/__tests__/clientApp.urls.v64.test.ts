// BF_CLIENT_v64_CLIENTAPP_URLS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BF_CLIENT_v64_CLIENTAPP_URLS", () => {
  const src = readFileSync(join(__dirname, "..", "clientApp.ts"), "utf8");
  it("anchor present", () => { expect(src.includes("BF_CLIENT_v64_CLIENTAPP_URLS")).toBe(true); });
  it("status url", () => {
    const idx = src.indexOf("status(token: string)");
    const next = src.indexOf("getApplication(applicationId: string)", idx);
    const body = src.slice(idx, next);
    expect(body).toContain("/api/client/application/");
    expect(body).toContain("/status`");
    expect(body).not.toContain("CLIENT_APPLICATIONS.PREFIX");
  });
  it("messages url", () => {
    const idx = src.indexOf("getMessages(token: string)");
    const next = src.indexOf("sendMessage(token: string", idx);
    const body = src.slice(idx, next);
    expect(body).toContain("/api/client/messages?applicationId=");
    expect(body).not.toContain("/api/client/applications/${token}/messages");
  });
});
