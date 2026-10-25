// BF_CLIENT_v852_CALC_QBO - the loan calculator: amortization maths (standard, 0%, balloon, frequencies, dates), the CSV and
// PDF downloads, and the panel (results, errors, Save to file).
import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  addMonths, calculateLoan, money, paymentCount, paymentDates, periodicPayment, scenarioNote, scheduleCsv, validateLoan, type LoanInput,
} from "../loanMath";
import { buildSchedulePdf } from "../loanPdf";
import LoanCalculator from "../LoanCalculator";

const base: LoanInput = { amount: 100000, annualRatePct: 6, termMonths: 12, frequency: "monthly", startDate: "2026-01-31" };
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

afterEach(() => vi.restoreAllMocks());

describe("amortization maths", () => {
  it("monthly: the standard payment, a schedule that ends at zero, interest that adds up", () => {
    const r = calculateLoan(base);
    expect(r.paymentPerPeriod).toBe(8606.64);
    expect(r.numberOfPayments).toBe(12);
    expect(r.schedule).toHaveLength(12);
    expect(r.schedule[0]).toMatchObject({ n: 1, date: "2026-02-28", interest: 500, principal: 8106.64, balance: 91893.36 });
    expect(r.schedule[11]!.balance).toBe(0);
    expect(sum(r.schedule.map((x) => x.principal))).toBe(100000);
    expect(r.totalInterest).toBe(sum(r.schedule.map((x) => x.interest)));
    expect(r.totalInterest).toBeGreaterThan(3279.6);
    expect(r.totalInterest).toBeLessThan(3279.8);
    expect(r.totalPayments).toBe(Math.round((100000 + r.totalInterest) * 100) / 100);
    expect(r.totalCost).toBe(r.totalPayments);
  });

  it("0% rate: equal principal payments and no interest", () => {
    const r = calculateLoan({ ...base, annualRatePct: 0 });
    expect(r.paymentPerPeriod).toBe(8333.33);
    expect(r.totalInterest).toBe(0);
    expect(r.schedule[11]!.payment).toBe(8333.37);
    expect(r.totalPayments).toBe(100000);
    expect(periodicPayment(1200, 0, 12, 600)).toBe(50);
  });

  it("down payment and balloon: financed amount, lower payments, balloon with the last payment", () => {
    const r = calculateLoan({ ...base, termMonths: 36, downPayment: 10000, balloon: 20000 });
    expect(r.financed).toBe(90000);
    const expected = Math.round(periodicPayment(90000, 0.005, 36, 20000) * 100) / 100;
    expect(r.paymentPerPeriod).toBe(expected);
    const last = r.schedule[35]!;
    expect(last.balance).toBe(0);
    expect(last.payment).toBeGreaterThan(20000);
    expect(r.schedule[34]!.balance).toBeGreaterThan(20000);
    expect(r.totalCost).toBe(Math.round((r.totalPayments + 10000) * 100) / 100);
    // with no down payment: the textbook balloon payment
    expect(Math.round(periodicPayment(100000, 0.005, 36, 20000) * 100) / 100).toBe(2533.75);
  });

  it("frequencies: bi-weekly, weekly and business-day counts and dates", () => {
    expect(paymentCount(12, "biweekly")).toBe(26);
    expect(paymentCount(12, "weekly")).toBe(52);
    expect(paymentCount(12, "daily")).toBe(260);
    expect(paymentCount(6, "weekly")).toBe(26);
    expect(paymentDates("2026-10-23", "weekly", 2)).toEqual(["2026-10-30", "2026-11-06"]);
    expect(paymentDates("2026-10-23", "biweekly", 2)).toEqual(["2026-11-06", "2026-11-20"]);
    // Friday -> Monday, Tuesday: weekends skipped
    expect(paymentDates("2026-10-23", "daily", 3)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    const daily = calculateLoan({ ...base, frequency: "daily" });
    expect(daily.numberOfPayments).toBe(260);
    expect(daily.periodicRate).toBeCloseTo(0.06 / 260, 12);
    expect(daily.schedule[259]!.balance).toBe(0);
    expect(daily.schedule.every((x) => ![0, 6].includes(new Date(x.date + "T00:00:00Z").getUTCDay()))).toBe(true);
  });

  it("explains bad inputs", () => {
    expect(validateLoan({ ...base, amount: 0 })).toContain("Enter an amount above zero.");
    expect(validateLoan({ ...base, annualRatePct: -1 })).toContain("Enter an interest rate from 0 to 100%.");
    expect(validateLoan({ ...base, termMonths: 0 })).toContain("Enter a term of 1 to 600 whole months.");
    expect(validateLoan({ ...base, downPayment: 100000 })).toContain("The down payment must be less than the amount.");
    expect(validateLoan({ ...base, balloon: 100000 })).toContain("The balloon must be less than the amount financed.");
    expect(validateLoan(base)).toEqual([]);
    expect(() => calculateLoan({ ...base, amount: -5 })).toThrow();
  });

  it("formats money and builds the note and the spreadsheet", () => {
    expect(money(1234567.891)).toBe("$1,234,567.89");
    expect(money(0)).toBe("$0.00");
    const r = calculateLoan(base);
    const note = scenarioNote(base, r);
    expect(note.split("\n")[0]).toBe("Loan calculator scenario");
    expect(note).toContain("Payment per period: $8,606.64");
    expect(note).toContain("Number of payments: 12");
    const csv = scheduleCsv(base, r).trim().split("\r\n");
    expect(csv).toContain("Payment #,Date,Payment,Principal,Interest,Balance");
    expect(csv[csv.length - 1]).toMatch(/^12,2027-01-31,8606\.\d\d,\d+\.\d\d,\d+\.\d\d,0\.00$/);
    expect(csv).toContain('Amount,"$100,000.00"');
  });
});

describe("PDF download", () => {
  it("is a valid PDF: header, one page object per page, a correct cross-reference table", () => {
    const daily = calculateLoan({ ...base, frequency: "daily" });
    const bytes = buildSchedulePdf({ ...base, frequency: "daily" }, daily, "Northern Lights Films (test)", "2026-10-23");
    const text = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    const pages = (text.match(/\/Type \/Page /g) ?? []).length;
    expect(pages).toBeGreaterThan(4);
    expect(text).toContain("/Count " + pages);
    expect(text).toContain("(Northern Lights Films \\(test\\)) Tj");
    const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(xref, xref + 4)).toBe("xref");
    const offsets = text.slice(xref).split("\n").slice(3).filter((l) => / 00000 n $/.test(l)).map((l) => Number(l.slice(0, 10)));
    offsets.forEach((off, i) => expect(text.slice(off, off + String(i + 1).length + 6)).toBe(i + 1 + " 0 obj"));
  });
});

describe("the calculator panel", () => {
  const fill = () => {
    fireEvent.change(screen.getByTestId("calc-rate"), { target: { value: "6" } });
    fireEvent.change(screen.getByTestId("calc-term"), { target: { value: "12" } });
  };

  it("starts from the requested amount and shows the results and the schedule", () => {
    render(<LoanCalculator initialAmount={100000} />);
    expect((screen.getByTestId("calc-amount") as HTMLInputElement).value).toBe("100000");
    fill();
    expect(screen.getByTestId("calc-out-payment-per-period").textContent).toBe("$8,606.64");
    expect(screen.getByTestId("calc-out-number-of-payments").textContent).toBe("12");
    expect(screen.getByTestId("calc-schedule").querySelectorAll("tbody tr")).toHaveLength(12);
    expect(screen.queryByTestId("calc-save")).toBeNull();
  });

  it("shows what is wrong instead of results", () => {
    render(<LoanCalculator initialAmount={100000} />);
    fill();
    fireEvent.change(screen.getByTestId("calc-down"), { target: { value: "150000" } });
    expect(screen.getByTestId("calc-errors").textContent).toContain("The down payment must be less than the amount.");
    expect(screen.queryByTestId("calc-schedule")).toBeNull();
  });

  it("Save to file passes the scenario text", async () => {
    const onSaveNote = vi.fn(async () => undefined);
    render(<LoanCalculator initialAmount={250000} onSaveNote={onSaveNote} />);
    fill();
    fireEvent.click(screen.getByTestId("calc-save"));
    await waitFor(() => expect(screen.getByTestId("calc-note").textContent).toBe("Saved to the file as a note."));
    expect(onSaveNote).toHaveBeenCalledTimes(1);
    expect((onSaveNote.mock.calls[0] as unknown as [string])[0]).toContain("Amount: $250,000.00");
  });

  it("Download PDF and Download spreadsheet hand over a file", async () => {
    const created: Blob[] = [];
    const g = globalThis as unknown as { URL: { createObjectURL?: (b: Blob) => string; revokeObjectURL?: (u: string) => void } };
    g.URL.createObjectURL = (b: Blob) => { created.push(b); return "blob:test"; };
    g.URL.revokeObjectURL = () => {};
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<LoanCalculator initialAmount={100000} title="Acme Ltd" />);
    fill();
    fireEvent.click(screen.getByTestId("calc-pdf"));
    await waitFor(() => expect(screen.getByTestId("calc-note").textContent).toBe("PDF ready."));
    fireEvent.click(screen.getByTestId("calc-csv"));
    await waitFor(() => expect(screen.getByTestId("calc-note").textContent).toContain("Spreadsheet ready"));
    expect(click).toHaveBeenCalledTimes(2);
    expect(created.map((b) => b.type)).toEqual(["application/pdf", "text/csv"]);
  });
});
