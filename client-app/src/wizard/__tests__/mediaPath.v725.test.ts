// BF_CLIENT_MEDIA_PATH_v725 + BF_CLIENT_CHAT_AUTOSCROLL_v725
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MEDIA_INDUSTRY, isMediaPathKyc, isMediaWizardPath } from "../wizardSchema";

const read = (p: string) => readFileSync(p, "utf8");

describe("media files take the short path", () => {
  it("recognises a media file from the purpose, the industry or the chosen product", () => {
    expect(isMediaPathKyc({ purposeOfFunds: "Media Financing" })).toBe(true);
    expect(isMediaPathKyc({ industry: MEDIA_INDUSTRY })).toBe(true);
    expect(isMediaPathKyc({ purposeOfFunds: "Working Capital", industry: "Retail" })).toBe(false);
    expect(isMediaWizardPath({ productCategory: "MEDIA", kyc: {} })).toBe(true);
    expect(isMediaWizardPath({ productCategory: "LOC", kyc: { industry: "Retail" } })).toBe(false);
  });
  it("offers the media industry and moves straight on from Step 1", () => {
    const s1 = read("src/wizard/Step1_KYC.tsx");
    expect(MEDIA_INDUSTRY).toBe("Media, movies, TV shows, video game production");
    expect(s1).toContain("<option>{MEDIA_INDUSTRY}</option>");
    expect(s1).toContain("if (isMediaPathKyc(nextKyc)) { if (Object.values(getStepErrors(nextKyc)).every((bad) => !bad)) void startApplication(nextKyc);");
    expect(s1).toContain("industry: !isStartupPathKyc(values) && !isMediaPathKyc(values)");
    expect(s1).toContain("{!isStartupPathKyc(app.kyc) && !onMediaPath && (");
  });
  it("skips Step 2 by picking Media / Film Financing", () => {
    expect(read("src/wizard/Step2_Product.tsx")).toContain("buckets.find((b: any) => /^MEDIA/i.test(String(b.bucket)))");
  });
  it("does not ask a media file for employees or yearly revenue", () => {
    const s3 = read("src/wizard/Step3_Business.tsx");
    expect(s3).toContain('const MEDIA_SKIP = new Set<string>(["employees", "estimatedRevenue"]);');
    expect((s3.match(/onSbaStartupPath \|\| onMediaPath \? "none"/g) || []).length).toBe(2);
  });
  it("the staff chat scrolls to the newest message", () => {
    const m = read("src/pages/MiniPortalPage.tsx");
    expect(m).toContain('<div className="mp-thread-card__body" ref={threadBodyRef}>');
    expect(m).toContain("el.scrollTop = el.scrollHeight;");
  });
});
