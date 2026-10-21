// BF_CLIENT_v839_REMOVE_UNFINISHED - an unfinished application the client started can be removed from the switcher;
// a file Boreal prepared for them (ready to finish) cannot.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppSwitcherSheet, toSwitcherApp } from "../CmpHome";

const unfinished = toSwitcherApp({ id: "d1", pipeline_state: "Received", submitted_at: null, business_name: "Draft application", product_category: "standard", updated_at: "2026-10-14T20:00:00Z" });
const prepared = toSwitcherApp({ id: "p1", pipeline_state: "draft", submitted_at: null, business_name: "Northwind Grocery Ltd", product_category: "standard", updated_at: "2026-10-19T20:00:00Z", ready_to_finish: true });
const sent = toSwitcherApp({ id: "s1", pipeline_state: "Additional Steps", submitted_at: "2026-10-01T00:00:00Z", business_name: "Todd's Grocery Store", product_category: "SBA", updated_at: "2026-10-16T00:00:00Z" });

describe("Remove in the application switcher", () => {
  it("is offered on the unfinished one only, and sends its id", () => {
    const onRemove = vi.fn();
    render(<AppSwitcherSheet apps={[sent, unfinished, prepared]} currentId="s1" onPick={vi.fn()} onContinue={vi.fn()} onRemove={onRemove} onClose={vi.fn()} />);
    const buttons = screen.getAllByTestId("cmp-app-remove");
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onRemove).toHaveBeenCalledWith("d1");
  });

  it("is not shown when the page does not offer it", () => {
    render(<AppSwitcherSheet apps={[unfinished]} currentId="x" onPick={vi.fn()} onContinue={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId("cmp-app-remove")).toBeNull();
  });
});
