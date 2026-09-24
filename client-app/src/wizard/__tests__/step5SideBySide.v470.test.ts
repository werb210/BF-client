// BF_CLIENT_BLOCK_v470_STEP5_SIDE_BY_SIDE
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const src = readFileSync(join(process.cwd(), "src", "wizard", "Step5_Documents.tsx"), "utf-8");
describe("v470 step 5: options side by side", () => {
 it("puts the three options in one wrapping row", () => { const row=src.indexOf('data-testid="step5-options-row"'); expect(row).toBeGreaterThan(-1); expect(src.slice(row,row+300)).toContain('display: "flex", flexWrap: "wrap"'); for(const id of ["step5-choose-now","step5-choose-later","step5-accountant-btn"]) expect(src.indexOf(`data-testid="${id}"`)).toBeGreaterThan(row); });
 it("supply later goes straight to Step 6", () => { const later=src.indexOf('data-testid="step5-choose-later"'); expect(src.slice(later,later+120)).toContain("onClick={() => { void uploadLater(); }}"); });
 it("sending to the accountant also goes straight to Step 6", () => { const fn=src.indexOf("async function referAccountant"); expect(src.slice(fn,fn+1200)).toContain("await uploadLater();"); const later=src.indexOf("async function uploadLater"); expect(src.slice(later,later+1600)).toContain('navigate("/apply/step-6");'); });
});
