// BF_CLIENT_CMP_PHONE_TABS_v732
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CmpTabBar } from "../CmpPhone";

describe("client portal phone layout", () => {
  // BF_CLIENT_v802_PHONE_UI - To do is part of Home, which carries the badge: Home, Chat, More, Settings.
  it("tab bar has Home, Chat, More, Settings with the to-do count on Home", () => {
    const onTab = vi.fn();
    render(<CmpTabBar tab="home" onTab={onTab} todoCount={3} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent?.replace(/\d+$/, ""))).toEqual(["Home", "Chat", "More", "Settings"]);
    expect(screen.getByTestId("cmp-tab-home").getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("cmp-tab-home").textContent).toContain("3");
    expect(screen.getByLabelText("3 to do").textContent).toBe("3");
    fireEvent.click(screen.getByTestId("cmp-tab-chat"));
    expect(onTab).toHaveBeenCalledWith("chat");
  });
  it("the page tags each section with its tab and shows the tab bar only on a phone", () => {
    const page = readFileSync(resolve(__dirname, "../../pages/MiniPortalPage.tsx"), "utf8");
    for (const t of ['data-cmp-tab="home"', 'data-cmp-tab="chat"', 'data-cmp-tab="more"']) expect(page).toContain(t);
    expect(page).toContain("{isPhone ? <CmpTabBar");
    expect(readFileSync(resolve(__dirname, "../MayaWidget.tsx"), "utf8")).toContain('data-maya-launcher="true"');
  });
});
