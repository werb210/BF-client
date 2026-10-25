// BF_CLIENT_v852_CALC_QBO - the More tab has a Loan calculator row; the sheet opens with the application's amount,
// works on a phone layout, and has no Save to file (that is staff only).
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CmpMore from "../../CmpMore";
import LoanCalculatorSheet from "../LoanCalculatorSheet";

describe("More -> Loan calculator", () => {
  it("is a row on the More tab", () => {
    const onCalculator = vi.fn();
    render(<CmpMore forms={[]} docsStatus={null} onForm={() => {}} onUpload={() => {}} onNewApplication={() => {}} onCalculator={onCalculator} />);
    fireEvent.click(screen.getByTestId("cmp-more-calculator"));
    expect(onCalculator).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Loan calculator")).toBeTruthy();
  });

  it("opens with the requested amount, calculates, and has no Save to file", () => {
    const onClose = vi.fn();
    render(<LoanCalculatorSheet requestedAmount={80000} title="Acme Ltd" onClose={onClose} />);
    expect((screen.getByTestId("calc-amount") as HTMLInputElement).value).toBe("80000");
    fireEvent.change(screen.getByTestId("calc-rate"), { target: { value: "0" } });
    fireEvent.change(screen.getByTestId("calc-term"), { target: { value: "8" } });
    expect(screen.getByTestId("calc-out-payment-per-period").textContent).toBe("$10,000.00");
    expect(screen.queryByTestId("calc-save")).toBeNull();
    // phone sizing: 16px inputs so iOS does not zoom
    expect((screen.getByTestId("calc-rate") as HTMLInputElement).style.fontSize).toBe("16px");
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
