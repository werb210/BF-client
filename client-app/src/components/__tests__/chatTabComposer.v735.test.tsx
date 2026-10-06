// BF_CLIENT_CHAT_TAB_COMPOSER_v735
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
const css = readFileSync("src/components/CmpPhone.css", "utf8");

describe("the phone Chat tab opens ready to type", () => {
  it("does not jump to the top of the page, and focuses the message box inside the tap", () => {
    const start = page.indexOf("BF_CLIENT_CHAT_TAB_COMPOSER_v735 - Chat opens");
    expect(start).toBeGreaterThan(-1);
    const handler = page.slice(start, start + 1200);
    expect(handler).toContain('if (t === "chat")');
    expect(handler).toContain("flushSync(() => setPhoneTab(t));");
    expect(handler).toContain("input.focus({ preventScroll: true })");
    expect(handler.indexOf("input.focus(")).toBeLessThan(handler.indexOf("window.scrollTo"));
    expect(page).toContain("<input ref={composerInputRef}");
  });
  it("keeps the message box on screen above the tab bar", () => {
    expect(css).toContain(".cmp-phone.cmp-tab-chat .mp-thread-card__composer { position: sticky;");
    expect(css).toContain(".cmp-phone.cmp-tab-chat .mp-thread-card { overflow: visible; }");
  });
});
