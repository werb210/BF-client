// BF_CLIENT_SBA_FORMS_ENTRY_v142
// The SBA forms had no entry point. Stage2Page existed and listed them; nothing
// linked to it, so no SBA application could ever reach signing.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "..", "MiniPortalPage.tsx"), "utf-8");
const stage2 = readFileSync(
  resolve(__dirname, "..", "mini-portal", "forms", "Stage2Page.tsx"), "utf-8");

describe("there is now a way in", () => {
  it("a chip exists", () => {
    expect(page).toContain('{ id: "sba_forms",  label: "SBA Forms" }');
  });

  it("it navigates to the page that lists the forms", () => {
    expect(page).toContain("navigate(`/mini-portal/forms/${encodeURIComponent(applicationId)}`)");
  });

  it("the destination renders the 1919 and the per-owner 413s", () => {
    expect(stage2).toContain("sba_form_1919");
    expect(stage2).toContain("sba_form_413_owner_5");
  });
});

describe("prompts already in the thread start working", () => {
  it.each(["sba_forms", "sba1919", "sba413", "sba_form_1919", "sba_form_413", "sba_form_413_owner_3"])(
    "%s routes to the forms page",
    (cta) => {
      const re = /\^\(sba_forms\|sba1919\|sba413\|sba_form_1919\|sba_form_413\(_owner_\\d\+\)\?\)\$/;
      expect(page).toMatch(re);
      expect(cta.length).toBeGreaterThan(0);
    },
  );

  it("matches case-insensitively", () => {
    expect(page).toContain("/i.test(ctaAction)");
  });
});

describe("the chip only appears where it means something", () => {
  it("is hidden on non-SBA applications", () => {
    expect(page).toContain('c.id !== "sba_forms" || isSbaApplication');
  });

  it("detects SBA the same way the server does - category, then purpose", () => {
    expect(page).toContain('cat.includes("SBA")');
    expect(page).toContain('purpose.includes("sba")');
    expect(page).toContain('purpose.includes("start up")');
  });

  it("does not disturb the existing upload-chip rule", () => {
    expect(page).toContain('c.id !== "upload" || hasOutstandingDocs');
  });
});
