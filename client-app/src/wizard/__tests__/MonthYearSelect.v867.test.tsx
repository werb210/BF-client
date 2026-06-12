import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { composeYearMonth, MonthYearSelect } from "../MonthYearSelect";

describe("BF_CLIENT_BLOCK_v867 — MonthYearSelect (Safari month fix)", () => {
  it("composeYearMonth only returns YYYY-MM when both parts are present", () => {
    expect(composeYearMonth("2020", "03")).toBe("2020-03");
    expect(composeYearMonth("", "03")).toBe("");
    expect(composeYearMonth("2020", "")).toBe("");
  });

  it("renders native selects, never input type=month", () => {
    const { container } = render(<MonthYearSelect ariaLabel="In Business Since" value="" onChange={() => {}} />);

    expect(container.querySelectorAll("select").length).toBe(2);
    expect(container.querySelector('input[type="month"]')).toBeNull();
  });

  it("emits an empty string until both parts are chosen, then YYYY-MM", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<MonthYearSelect ariaLabel="In Business Since" value="" onChange={onChange} />);

    fireEvent.change(getByLabelText("In Business Since month"), { target: { value: "03" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    fireEvent.change(getByLabelText("In Business Since year"), { target: { value: "2020" } });
    expect(onChange).toHaveBeenLastCalledWith("2020-03");
  });

  it("pre-fills from an existing YYYY-MM value", () => {
    const { getByLabelText } = render(<MonthYearSelect ariaLabel="Fiscal Year-End" value="2026-09" onChange={() => {}} />);

    expect((getByLabelText("Fiscal Year-End year") as HTMLSelectElement).value).toBe("2026");
    expect((getByLabelText("Fiscal Year-End month") as HTMLSelectElement).value).toBe("09");
  });
});
