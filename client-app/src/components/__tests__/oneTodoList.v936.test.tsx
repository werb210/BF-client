// BF_CLIENT_v936_ONE_TODO_LIST - funding conditions are one group inside "What you need to do",
// counted with the documents and forms, so the client sees one list and one number.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const apiCall = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({ apiCall }));
vi.mock("@/auth/token", () => ({ getToken: () => "test" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "http://localhost" } }));
vi.mock("@/native/appBadge", () => ({ setAppBadge: vi.fn(), clearAppBadge: vi.fn() }));
vi.mock("@/native/clientWidget", () => ({ updateClientWidget: vi.fn(), clearClientWidget: vi.fn(), actionLine: () => "" }));

import ActionCenter from "../ActionCenter";
import type { ClientCondition } from "../cmp/FundingConditionsCard";

const bank = { key: "upload:bank_statements", kind: "document", label: "Bank statements", urgent: false };
const cond = (over: Partial<ClientCondition>): ClientCondition => ({ id: "c1", title: "Void cheque", description: null, due_date: null, status: "open", requires_document: true, submitted: false, ...over });

afterEach(() => { cleanup(); apiCall.mockReset(); });

describe("v936 one to-do list", () => {
  it("counts open funding conditions with the other items", async () => {
    apiCall.mockResolvedValue({ outstanding: [bank], completed: [], outstandingCount: 1 });
    const send = vi.fn();
    render(<ActionCenter applicationId="app-1" conditions={{ list: [cond({}), cond({ id: "c2", title: "Insurance certificate", requires_document: false })], busy: null, note: null, send }} />);
    expect(await screen.findByText("3 items remaining")).toBeTruthy();
    expect(screen.getByText("Before funding (2)")).toBeTruthy();
    fireEvent.click(screen.getByText("Mark as done"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: "c2" }));
  });

  it("shows the list while a condition is open even when nothing else is outstanding", async () => {
    apiCall.mockResolvedValue({ outstanding: [], completed: [bank], outstandingCount: 0 });
    render(<ActionCenter applicationId="app-1" conditions={{ list: [cond({})], busy: null, note: null, send: vi.fn() }} />);
    expect(await screen.findByText("1 item remaining")).toBeTruthy();
    expect(screen.getByText("Upload the document")).toBeTruthy();
  });

  it("the grouped layout counts a sent condition as done", async () => {
    apiCall.mockResolvedValue({ outstanding: [bank], completed: [], outstandingCount: 1 });
    render(<ActionCenter applicationId="app-1" grouped conditions={{ list: [cond({ submitted: true })], busy: null, note: null, send: vi.fn() }} />);
    expect((await screen.findByTestId("action-center-progress")).textContent).toBe("1 of 2 done");
    expect(screen.getByText("Sent - your advisor is reviewing it.")).toBeTruthy();
  });

  it("renders nothing once every item and condition is done", async () => {
    apiCall.mockResolvedValue({ outstanding: [], completed: [bank], outstandingCount: 0 });
    const { container } = render(<ActionCenter applicationId="app-1" conditions={{ list: [cond({ submitted: true })], busy: null, note: null, send: vi.fn() }} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="action-center"]')).toBeNull();
  });
});
