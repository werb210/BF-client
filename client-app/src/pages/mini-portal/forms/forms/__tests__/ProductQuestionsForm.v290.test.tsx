// BF_CLIENT_PRODUCT_QUESTIONS_v290
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const apiCall = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({ apiCall }));

import ProductQuestionsForm, { dependencyId, groupQuestions, isVisible, stillMissing, type ProductQuestion } from "../ProductQuestionsForm";

const q = (over: Partial<ProductQuestion>): ProductQuestion => ({
  id: "business.x", key: "x", label: "X", type: "text", section: "business", required: true, options: null, showIf: null, ownerIndex: null, ownerName: null, value: "", ...over,
});
const questions: ProductQuestion[] = [
  q({ id: "business.fiscalYearEnd", key: "fiscalYearEnd", label: "Fiscal year-end month", type: "month" }),
  q({ id: "business.riskGovtArrears", key: "riskGovtArrears", label: "Any past-due government balances?", type: "yesno", section: "risk" }),
  q({ id: "business.riskGovtArrearsDetail", key: "riskGovtArrearsDetail", label: "Please provide details", section: "risk", showIf: { key: "riskGovtArrears", equals: "Yes" } }),
  q({ id: "owner.0.ownRent", key: "ownRent", label: "Own or rent your home?", type: "select", options: ["Own", "Rent"], section: "owner", ownerIndex: 0, ownerName: "Tanya Voss" }),
  q({ id: "owner.0.propertyValue", key: "propertyValue", label: "Property value", type: "money", section: "owner", ownerIndex: 0, ownerName: "Tanya Voss", showIf: { key: "ownRent", equals: "Own" } }),
  q({ id: "owner.1.ownRent", key: "ownRent", label: "Own or rent your home?", type: "select", options: ["Own", "Rent"], section: "owner", ownerIndex: 1, ownerName: "Mark Voss" }),
];

describe("follow-up questions", () => {
  it("depend on the answer in the same scope and owner", () => {
    expect(dependencyId(questions[4])).toBe("owner.0.ownRent");
    expect(isVisible(questions[4], { "owner.0.ownRent": "Rent", "owner.1.ownRent": "Own" })).toBe(false);
    expect(isVisible(questions[4], { "owner.0.ownRent": "Own" })).toBe(true);
  });
  it("only count as missing when shown", () => {
    expect(stillMissing(questions, { "business.fiscalYearEnd": "12", "business.riskGovtArrears": "No", "owner.0.ownRent": "Rent", "owner.1.ownRent": "Rent" })).toEqual([]);
    expect(stillMissing(questions, { "business.fiscalYearEnd": "12", "business.riskGovtArrears": "Yes", "owner.0.ownRent": "Own", "owner.1.ownRent": "Rent" })).toEqual(["business.riskGovtArrearsDetail", "owner.0.propertyValue"]);
  });
  it("groups business, risk, then each owner by name", () => {
    expect(groupQuestions(questions).map((g) => g.title)).toEqual(["About the business", "Risk questions", "About Tanya Voss", "About Mark Voss"]);
  });
});

describe("the form", () => {
  beforeEach(() => apiCall.mockReset());
  it("won't submit with required answers missing, then submits once they are in", async () => {
    apiCall.mockImplementation(async (_url: string, init?: any) => init?.method === "POST" ? { ok: true } : { set: "loc_accord", setLabel: "Line of Credit", missing: [], submittedAt: null, questions });
    render(<ProductQuestionsForm applicationId="app-1" onComplete={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Line of Credit questions")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(screen.getByRole("alert").textContent).toContain("Please answer the 4 highlighted questions");
    expect(apiCall.mock.calls.some((c) => c[1]?.method === "POST")).toBe(false);
    fireEvent.change(screen.getAllByLabelText("Fiscal year-end month")[0], { target: { value: "December" } });
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    const ownRent = screen.getAllByLabelText("Own or rent your home?");
    fireEvent.change(ownRent[0], { target: { value: "Own" } });
    fireEvent.change(screen.getByLabelText("Property value"), { target: { value: "650000" } });
    fireEvent.change(ownRent[1], { target: { value: "Rent" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit answers" }));
    await waitFor(() => expect(screen.getByTestId("product-questions-done")).toBeTruthy());
    const post = apiCall.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(post[0]).toBe("/api/client/applications/app-1/product-questions");
    expect(post[1].body).toEqual({ submit: true, answers: { "business.fiscalYearEnd": "December", "business.riskGovtArrears": "No", "owner.0.ownRent": "Own", "owner.0.propertyValue": "650000", "owner.1.ownRent": "Rent" } });
  });
});

describe("mini-portal wiring", () => {
  const page = readFileSync(join(__dirname, "..", "..", "..", "..", "MiniPortalPage.tsx"), "utf8");
  it("opens the form and hides the prompt once answered", () => {
    expect(page).toContain('ctaAction.startsWith("product_questions:")) { setOpenForm("product_questions"); return; }');
    expect(page).toContain('m.ctaAction.startsWith("product_questions") && productQuestionsMissing === 0) return null;');
    expect(page).toContain('{openForm === "product_questions" && (');
  });
});
