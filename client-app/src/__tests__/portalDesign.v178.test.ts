// BF_CLIENT_PORTAL_v178 - the portal ran on 27 colours, none of them brand,
// while the wizard beside it ran on navy and gold.
import { describe, it, expect } from "vitest";
import fs from "fs";

const CSS = fs.readFileSync("src/pages/MiniPortalPage.css", "utf8");

describe("the portal is on the brand palette", () => {
  for (const stale of ["#3b82f6", "#2563eb", "#1d4ed8", "#1E3A8A", "#e5e7eb", "#e0f2fe"]) {
    it(`no longer uses ${stale}`, () => {
      expect(CSS).not.toContain(stale);
    });
  }

  it("uses navy, gold, mist and the brand hairline", () => {
    expect(CSS).toContain("#0B1F3A");
    expect(CSS).toContain("#BF9B49");
    expect(CSS).toContain("#F5F8FC");
    expect(CSS).toContain("#E4EAF2");
  });
});

describe("contrast on the new gold surfaces", () => {
  it("the stage bullet carries a navy glyph, not white", () => {
    const bullet = CSS.slice(CSS.indexOf(".mp-stage__bullet"), CSS.indexOf(".mp-stage__label"));
    expect(bullet).toContain("color:#0B1F3A");
    expect(bullet).not.toContain("color:#fff");
  });

  it("the message CTA is navy on gold", () => {
    expect(CSS).toContain(".mp-msg-cta{margin-top:8px;background:#BF9B49;color:#0B1F3A;");
  });
});

describe("semantic colours survive", () => {
  it("keeps call, hang-up, error and warning", () => {
    expect(CSS).toContain("#16a34a");
    expect(CSS).toContain("#ef4444");
    expect(CSS).toContain("#dc2626");
    expect(CSS).toContain("#f59e0b");
  });
});

describe("typography", () => {
  it("headings use the display serif", () => {
    expect(CSS).toContain("Libre Caslon Text");
  });
});
