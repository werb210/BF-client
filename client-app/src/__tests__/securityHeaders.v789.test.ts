// BF_CLIENT_v789_SECURITY_HEADERS - the Static Web App sends a CSP and the
// standard hardening headers on every response. Reads public/ and index.html,
// which are deployment config, not application source.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, "public", "staticwebapp.config.json"), "utf8")) as {
  globalHeaders?: Record<string, string>;
};
const headers = config.globalHeaders ?? {};
const csp = headers["Content-Security-Policy"] ?? "";
const directive = (name: string): string[] => {
  const part = csp.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + " "));
  return part ? part.split(/\s+/).slice(1) : [];
};

describe("staticwebapp.config.json globalHeaders", () => {
  it("sends the hardening headers", () => {
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d{7,}/);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe("microphone=(self), camera=(self)");
  });

  it("never allows eval or inline script", () => {
    expect(csp).not.toContain("unsafe-eval");
    expect(directive("script-src")).not.toContain("'unsafe-inline'");
    expect(directive("frame-ancestors")).toEqual(["'none'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
  });

  it("allows the API, Twilio, Google tags and Clarity", () => {
    const connect = directive("connect-src");
    expect(connect).toContain("https://server.boreal.financial");
    expect(connect).toContain("wss://*.twilio.com");
    expect(connect).toContain("https://*.google-analytics.com");
    expect(connect).toContain("https://*.clarity.ms");
    const script = directive("script-src");
    expect(script).toContain("https://*.googletagmanager.com");
    expect(script).toContain("https://*.googleadservices.com");
    expect(script).toContain("https://*.clarity.ms");
  });

  it("allows the signing and bank-connection frames", () => {
    const frames = directive("frame-src");
    expect(frames).toContain("https://*.signnow.com");
    expect(frames).toContain("https://*.flinksapp.io");
  });
});

describe("index.html carries no inline script for the CSP to allow", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  it("every <script> has a src", () => {
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) expect(tag).toMatch(/\ssrc=/);
  });
  it("has no inline event handlers", () => {
    expect(html).not.toMatch(/\son(load|error|click)=/i);
  });
});
