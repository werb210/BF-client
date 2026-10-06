// BF_CLIENT_SBA_FORMS_LISTED_v733
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "../Stage2Page.tsx"), "utf8");
const portal = readFileSync(resolve(__dirname, "../../../MiniPortalPage.tsx"), "utf8");

describe("SBA forms always appear where Fill in sends the client", () => {
  it("the forms page lists the SBA forms the to-do list names", () => {
    expect(page).toContain('"/api/client/documents-needed/action-center?applicationId="');
    expect(page).toContain('.filter((k: string) => k.startsWith("form:sba_form_"))');
    expect(page).toContain("stage2.push({ document_type: k, required: true, stage: 2 })");
  });
  it("Fill in opens that exact form", () => {
    expect(portal).toContain("?form=${encodeURIComponent(rest)}");
    expect(page).toContain('const wantedForm = searchParams.get("form");');
    expect(page).toContain("if (wantedForm && FORM_RENDERERS[wantedForm]) setActiveForm(wantedForm);");
  });
});
