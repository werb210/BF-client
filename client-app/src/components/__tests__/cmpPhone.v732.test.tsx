// BF_CLIENT_CMP_PHONE_TABS_v732
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CmpTabBar, CmpChatSwitch, CmpNextStep } from "../CmpPhone";

describe("client portal phone layout", () => {
  it("tab bar has Home, To do, Chat, More with the to-do count", () => {
    const onTab = vi.fn();
    render(<CmpTabBar tab="home" onTab={onTab} todoCount={3} />);
    expect(screen.getByTestId("cmp-tab-home").getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText("3 to do").textContent).toBe("3");
    fireEvent.click(screen.getByTestId("cmp-tab-chat"));
    expect(onTab).toHaveBeenCalledWith("chat");
  });
  it("Ask Maya opens Maya's chat", () => {
    const seen: string[] = [];
    window.addEventListener("maya:open", () => seen.push("open"));
    render(<CmpChatSwitch />);
    fireEvent.click(screen.getByTestId("cmp-ask-maya"));
    expect(seen).toEqual(["open"]);
  });
  it("Home shows the next step and opens the to-do list", () => {
    const onOpen = vi.fn();
    render(<CmpNextStep label="Bank statements, April to September 2026" remaining={3} onOpen={onOpen} />);
    expect(screen.getByTestId("cmp-next-step").textContent).toContain("2 more items after this one.");
    fireEvent.click(screen.getByText("Open my to-do list"));
    expect(onOpen).toHaveBeenCalled();
  });
  it("the page tags each section with its tab and shows the tab bar only on a phone", () => {
    const page = readFileSync(resolve(__dirname, "../../pages/MiniPortalPage.tsx"), "utf8");
    for (const t of ['data-cmp-tab="home"', 'data-cmp-tab="todo"', 'data-cmp-tab="chat"', 'data-cmp-tab="more"']) expect(page).toContain(t);
    expect(page).toContain("{isPhone ? <CmpTabBar");
    expect(readFileSync(resolve(__dirname, "../MayaWidget.tsx"), "utf8")).toContain('data-maya-launcher="true"');
  });
});
