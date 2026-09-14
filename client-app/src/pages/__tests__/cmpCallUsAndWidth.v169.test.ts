import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "src/pages/MiniPortalPage.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/pages/MiniPortalPage.css"), "utf8");

describe("BF_CLIENT_CALLUS_AUTH_v169", () => {
  it("sends the bearer token when minting a voice token", () => {
    // callerOwnsApplication reads the phone claim from the JWT; without the
    // header it returns false and the server answers 403 not_your_application.
    const at = page.indexOf("const tokenUrl");
    const fetchAt = page.indexOf("await fetch(tokenUrl", at);
    const slice = page.slice(fetchAt, fetchAt + 320);
    expect(slice).toContain("Authorization");
    expect(slice).toContain("getToken()");
  });

  it("still sends credentials, which other routes rely on", () => {
    const fetchAt = page.indexOf("await fetch(tokenUrl");
    expect(page.slice(fetchAt, fetchAt + 320)).toContain('credentials: "include"');
  });

  it("uses the API base rather than a relative URL", () => {
    // A relative URL resolved to index.html on the Static Web App host.
    expect(page).toContain("ENV.API_BASE");
  });
});

describe("BF_CLIENT_CMP_MOBILE_WIDTH_v169", () => {
  const mobile = css.slice(css.indexOf("@media (max-width: 767px)"));

  it("drops the action chips to one column on a phone", () => {
    // 1fr 1fr with long labels forced the page wider than the viewport.
    expect(mobile).toContain(".mp-actions__chips{grid-template-columns:1fr}");
  });

  it("lets chip tracks shrink below their content width", () => {
    expect(mobile).toContain(".mp-actions__chips > *{min-width:0}");
  });

  it("wraps a long chip label instead of widening the track", () => {
    expect(mobile).toContain("overflow-wrap:anywhere");
  });

  it("gives the page a hard ceiling at the viewport", () => {
    expect(css).toContain("width: 100%");
    expect(css).toContain("box-sizing: border-box");
    expect(css).toContain(".mp-root > * { min-width: 0; }");
  });

  it("keeps the desktop two-column layout", () => {
    const desktop = css.slice(0, css.indexOf("@media (max-width: 767px)"));
    expect(desktop).toContain("grid-template-columns:1fr 1fr");
  });
});
