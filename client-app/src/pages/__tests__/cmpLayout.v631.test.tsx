// BF_CLIENT_CMP_LAYOUT_v631
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf-8");
const guard = readFileSync("src/auth/RequireOTP.tsx", "utf-8");
const router = readFileSync("src/router/AppRouter.tsx", "utf-8");

describe("v631 mini portal layout", () => {
  it("puts the Boreal header first, with the account row under it", () => {
    expect(page.indexOf("<SlimHeader />")).toBeLessThan(page.indexOf("<AccountBar />"));
    expect(guard).toContain("{accountBarInPage ? null : <AccountBar />}");
    expect(router).toContain('<Route path="/application/:id" element={<RequireOTP accountBarInPage><MiniPortalPage /></RequireOTP>} />');
    expect(router).toContain('<Route path="/portal" element={<RequireOTP accountBarInPage><MiniPortalPage /></RequireOTP>} />');
  });

  it("titles the chat for the client", () => {
    expect(page).toContain('<header className="mp-thread-card__header">Chat with Boreal Staff</header>');
    expect(page).not.toContain('<header className="mp-thread-card__header">Client</header>');
  });

  it("shows CRA, Connect Bank and collateral forms only when staff requested them", () => {
    expect(page).toContain("ALWAYS_CHIPS.has(c.id) || requestedForms.has(c.id)");
    expect(page).toContain("onData={onTodoData}");
  });
});
