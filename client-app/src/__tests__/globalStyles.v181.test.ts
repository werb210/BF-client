// BF_CLIENT_GLOBALS_v181 - both stylesheets load on every page, so a wrong
// value here reaches further than anything else in the app.
import { describe, it, expect } from "vitest";
import fs from "fs";

const THEME = fs.readFileSync("src/theme/global.css", "utf8");
const GLOBAL = fs.readFileSync("src/styles/global.css", "utf8");

describe("brand variables hold brand values", () => {
  it("--boreal-gold is the brand gold", () => {
    expect(THEME).toContain("--boreal-gold: #BF9B49;");
    expect(THEME).not.toContain("#f3c969");
  });

  it("--boreal-blue is navy, not a stray blue", () => {
    expect(THEME).toContain("--boreal-blue: #0B1F3A;");
    expect(THEME).not.toContain("#2563eb");
    expect(THEME).not.toContain("#1d4ed8");
  });

  it("neutrals are the brand scale", () => {
    expect(THEME).toContain("--boreal-gray-border: #E4EAF2;");
    expect(THEME).toContain("--boreal-text-muted: #51617D;");
  });

  it("keeps the semantic success colour", () => {
    expect(THEME).toContain("--boreal-green");
  });
});

describe("body does not override the brand face", () => {
  it("names Public Sans first", () => {
    expect(GLOBAL).toContain('font-family: "Public Sans"');
  });

  it("uses mist and ink for ground and text", () => {
    expect(GLOBAL).toContain("background: #F5F8FC");
    expect(GLOBAL).toContain("color: #0B1F3A");
    expect(GLOBAL).not.toContain("#f9fafb");
    expect(GLOBAL).not.toContain("#111827");
  });
});
