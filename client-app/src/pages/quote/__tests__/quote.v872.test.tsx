// BF_CLIENT_v872_QUOTES - "Your quote": options side by side (with sales tax on fees), accept with name + tick, decline,
// finished states.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({ apiCall: vi.fn() }));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/auth/token", () => ({ getToken: () => "tok" }));

import QuotePage from "@/pages/quote/QuotePage";

const opt = (id: string, lender: string, over: Record<string, unknown> = {}) => ({ id, lender_name: lender, product_name: null as string | null, amount: 75000, term_months: 9, rate_kind: "factor_rate", rate: 1.28, payment_frequency: "weekly", payment_count: 39, payment_amount: 2461.54, fees: [{ label: "Origination", amount: 1500, deducted: true }], total_fees: 1500, total_repayment: 96000, cost_of_borrowing: 22500, net_proceeds: 73500, estimated_apr: 70.12, recommended: false, notes: null as string | null, ...over });
const quote = (over: Record<string, unknown> = {}) => ({ id: "q1", quote_number: "Q-261101-AB12C", status: "viewed", title: "Your financing options", message: "Two good choices.", currency: "CAD", expires_on: "2026-11-15", accepted_option_id: null as string | null, options: [opt("a", "Northern Capital", { recommended: true }), opt("b", "Prairie Funding", { rate_kind: "interest_rate", rate: 14 })], ...over });

const renderAt = () => render(<MemoryRouter initialEntries={["/quote/q1"]}><Routes><Route path="/quote/:quoteId" element={<QuotePage />} /></Routes></MemoryRouter>);

beforeEach(() => h.apiCall.mockReset());

describe("Your quote", () => {
  it("shows every option with payment, fees and total cost of borrowing", async () => {
    h.apiCall.mockResolvedValue({ ok: true, quote: quote() });
    renderAt();
    const first = await screen.findByTestId("quote-option-0");
    expect(first.textContent).toMatch(/Northern Capital/);
    expect(first.textContent).toMatch(/Recommended/);
    expect(first.textContent).toMatch(/\$2,461\.54 a week \(39 payments\)/);
    expect(first.textContent).toMatch(/Origination \(taken from the funds\)\$1,500\.00/);
    expect(first.textContent).toMatch(/Total cost of borrowing\$22,500\.00/);
    expect(screen.getByTestId("quote-option-1").textContent).toMatch(/14\.00% a year/);
  });

  it("shows the sales tax on fees when the quote has any", async () => {
    h.apiCall.mockResolvedValue({ ok: true, quote: quote({ options: [opt("a", "Northern Capital", { fees: [{ label: "Broker fee", amount: 1500, deducted: false, taxable: true }], tax_lines: [{ label: "GST 5%", amount: 75 }], total_tax: 75 })] }) });
    renderAt();
    expect((await screen.findByTestId("quote-tax-line")).textContent).toBe("Sales tax on fees (GST 5%)$75.00");
  });

  it("accepting needs an option, then sends the name and the tick", async () => {
    h.apiCall.mockImplementation(async (url?: string) => (String(url ?? "").endsWith("/accept") ? { ok: true, quote: quote({ status: "accepted", accepted_option_id: "b" }) } : { ok: true, quote: quote() }));
    renderAt();
    fireEvent.click(await screen.findByRole("button", { name: "Accept this option" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/choose one of the options/);
    fireEvent.click(screen.getByRole("radio", { name: /Prairie Funding/ }));
    fireEvent.change(screen.getByLabelText("Type your full name"), { target: { value: "Jane Doe" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Accept this option" }));
    await waitFor(() => expect(h.apiCall).toHaveBeenCalledWith("/api/client/quotes/q1/accept", { method: "POST", body: { option_id: "b", name: "Jane Doe", agree: true } }));
    expect((await screen.findByTestId("quote-done")).textContent).toMatch(/You chose Prairie Funding/);
  });

  it("decline with a reason", async () => {
    h.apiCall.mockImplementation(async (url?: string) => (String(url ?? "").endsWith("/decline") ? { ok: true, quote: quote({ status: "declined" }) } : { ok: true, quote: quote() }));
    renderAt();
    fireEvent.click(await screen.findByRole("button", { name: "None of these work for me" }));
    fireEvent.change(screen.getByLabelText("Tell us why (optional)"), { target: { value: "Payments too high" } });
    fireEvent.click(screen.getByRole("button", { name: "Decline the quote" }));
    await waitFor(() => expect(h.apiCall).toHaveBeenCalledWith("/api/client/quotes/q1/decline", { method: "POST", body: { reason: "Payments too high" } }));
    expect((await screen.findByTestId("quote-done")).textContent).toMatch(/declined/);
  });

  it("an expired quote cannot be answered", async () => {
    h.apiCall.mockResolvedValue({ ok: true, quote: quote({ status: "expired" }) });
    renderAt();
    expect((await screen.findByTestId("quote-done")).textContent).toMatch(/expired/);
    expect(screen.queryByRole("button", { name: "Accept this option" })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
