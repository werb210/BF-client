// BF_CLIENT_PHONE_POLISH_v751
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { CmpMoreFooter, appBuildLabel } from "../components/CmpPhone";

describe("phone polish", () => {
  it("the native shell no longer adds a second safe-area inset", () => {
    expect(readFileSync("capacitor.config.ts", "utf8")).toContain("contentInset: 'never'");
  });
  it("the tab bar hides while the keyboard is up", () => {
    const css = readFileSync("src/components/CmpPhone.css", "utf8");
    expect(css).toContain(".kb-open .cmp-tabbar { display: none; }");
    expect(readFileSync("src/components/CmpPhone.tsx", "utf8")).toContain('classList.toggle("kb-open"');
  });
  it("More shows Delete account and the running build", () => {
    let deleted = false;
    render(<CmpMoreFooter onDeleteAccount={() => { deleted = true; }} />);
    expect(screen.getByTestId("cmp-version").textContent).toMatch(/Web app/);
    screen.getByText("Delete account").click();
    expect(deleted).toBe(true);
  });
  it("labels the build with commit and Alberta time", () => {
    expect(appBuildLabel("2026-10-10T17:05:00Z", "abc1234")).toMatch(/^build abc1234 · Oct 10, 11:05/);
    expect(appBuildLabel(undefined, undefined)).toBe("");
  });
  it("the To do tab says when there is nothing to do, and the account row moved to More", () => {
    const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
    expect(page).toContain('data-testid="cmp-todo-empty"');
    expect(page).toContain('{!isPhone || phoneTab === "more" ? <AccountBar /> : null}');
  });
});
