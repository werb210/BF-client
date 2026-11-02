// BF_CLIENT_v867_BROKER_TOOLS_CREDIT_BUREAU - the client gives consent to a credit check.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ apiCall: vi.fn() }));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));

import CreditConsentCard, { type ClientConsent } from "../CreditConsentCard";

beforeEach(() => h.apiCall.mockReset());

describe("credit consent card", () => {
  it("is hidden when nothing is asked", async () => {
    h.apiCall.mockResolvedValue({ consents: [{ id: "c1", status: "given", person: "Ann Client", consent_text: "x", given_at: "2026-11-01", needs_date_of_birth: false }] });
    const { container } = render(<CreditConsentCard applicationId="a1" />);
    await waitFor(() => expect(h.apiCall).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });

  it("shows the wording and sends the typed name, date of birth and agreement", async () => {
    let consents: ClientConsent[] = [{ id: "c1", status: "requested", person: "Ann Client", consent_text: "I, Ann Client, consent to the credit check.", given_at: null, needs_date_of_birth: true }];
    h.apiCall.mockImplementation(async (url?: string) => {
      if (String(url ?? "").startsWith("/api/client-credit/consents?")) return { consents };
      consents = [];
      return { ok: true };
    });
    render(<CreditConsentCard applicationId="a1" />);
    expect(await screen.findByText("I, Ann Client, consent to the credit check.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Full name for Ann Client"), { target: { value: "Ann Client" } });
    fireEvent.change(screen.getByLabelText("Date of birth for Ann Client"), { target: { value: "1980-04-02" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Give consent" }));
    await waitFor(() => expect(h.apiCall).toHaveBeenCalledWith("/api/client-credit/consents/c1", { method: "POST", body: { applicationId: "a1", full_name: "Ann Client", date_of_birth: "1980-04-02", agree: true } }));
  });
});
