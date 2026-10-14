// BF_CLIENT_v807_FORMS - the CMP forms work for Canada and the United States:
// the shared address block, the one-line address still saved for the PDF and
// portal views, the Personal Net Worth labels and the Advisors wording.
// All render-based; the API mock answers by form key, not by call order.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getFormResponse: vi.fn(),
  saveFormResponse: vi.fn(),
  submitFormResponse: vi.fn(),
}));
vi.mock("@/lib/api", () => api);

import RealEstateCollateralForm from "../RealEstateCollateralForm";
import PersonalNetWorthForm from "../PersonalNetWorthForm";
import AdvisorsForm from "../AdvisorsForm";

// Saved responses per form key; anything not listed is a first open.
let saved: Record<string, unknown> = {};

const lastSubmitted = (formKey: string) => {
  const calls = api.submitFormResponse.mock.calls.filter((c) => c[1] === formKey);
  return calls[calls.length - 1]?.[2];
};

beforeEach(() => {
  saved = {};
  api.getFormResponse.mockReset().mockImplementation(async (_app: string, formKey: string) => saved[formKey] ?? null);
  api.saveFormResponse.mockReset().mockResolvedValue({});
  api.submitFormResponse.mockReset().mockImplementation(async (_app: string, formKey: string) =>
    formKey === "net_worth_statement" ? { signing_url: "https://sign.example/doc" } : {});
  try { window.localStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => cleanup());

const optionValues = (select: HTMLElement) =>
  Array.from((select as HTMLSelectElement).querySelectorAll("option")).map((o) => o.value).filter(Boolean);

describe("address block (Real Estate property)", () => {
  const block = () => within(screen.getByTestId("re-0-address"));

  it("lists provinces and states until a country is chosen, then narrows to it", async () => {
    render(<RealEstateCollateralForm applicationId="app-re" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());

    const region = block().getByLabelText("Province / State");
    expect(block().getByLabelText("Postal / ZIP code")).toBeTruthy();
    const groups = Array.from(region.querySelectorAll("optgroup")).map((g) => g.getAttribute("label"));
    expect(groups).toEqual(["Canada", "United States"]);
    expect(optionValues(region)).toHaveLength(13 + 51);

    fireEvent.change(block().getByLabelText("Country"), { target: { value: "US" } });
    const state = block().getByLabelText("State");
    expect(block().getByLabelText("ZIP code")).toBeTruthy();
    expect(block().queryByLabelText("Province / State")).toBeNull();
    const states = optionValues(state);
    expect(states).toHaveLength(51);
    expect(states).toContain("TX");
    expect(states).toContain("DC");
    expect(states).not.toContain("AB");

    fireEvent.change(block().getByLabelText("Country"), { target: { value: "CA" } });
    expect(optionValues(block().getByLabelText("Province"))).toHaveLength(13);
    expect(block().getByLabelText("Postal code")).toBeTruthy();
  });

  it("picking AB sets the country to Canada, and the one-line address is still submitted", async () => {
    const onComplete = vi.fn();
    render(<RealEstateCollateralForm applicationId="app-re" onComplete={onComplete} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());

    fireEvent.change(block().getByLabelText("Street"), { target: { value: "123 Main St" } });
    fireEvent.change(block().getByLabelText("City"), { target: { value: "Calgary" } });
    fireEvent.change(block().getByLabelText("Province / State"), { target: { value: "AB" } });
    expect((block().getByLabelText("Country") as HTMLSelectElement).value).toBe("CA");
    fireEvent.change(block().getByLabelText("Postal code"), { target: { value: "t2p1a1" } });
    expect((block().getByLabelText("Postal code") as HTMLInputElement).value).toBe("T2P 1A1");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const p = lastSubmitted("real_estate_collateral_disclosure").properties[0];
    expect(p.address).toBe("123 Main St, Calgary, AB T2P 1A1, Canada");
    expect(p.street).toBe("123 Main St");
    expect(p.city_province).toBe("Calgary, AB");
    expect(p).toMatchObject({ address_city: "Calgary", address_region: "AB", address_postal: "T2P 1A1", address_country: "CA" });
  });

  it("loads a property saved before the address block", async () => {
    saved.real_estate_collateral_disclosure = { data: { properties: [{ street: "9 Elm Rd", city_province: "Regina, SK" }] } };
    render(<RealEstateCollateralForm applicationId="app-re" onComplete={vi.fn()} />);
    await waitFor(() => expect((block().getByLabelText("Street") as HTMLInputElement).value).toBe("9 Elm Rd"));
    expect((block().getByLabelText("City") as HTMLInputElement).value).toBe("Regina");
    expect((block().getByLabelText("Province") as HTMLSelectElement).value).toBe("SK");
  });
});

describe("Personal Net Worth", () => {
  it("shows labels for both countries", async () => {
    render(<PersonalNetWorthForm applicationId="app-pnw" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("checkbox", { name: /Joint declaration/ }));
    expect(screen.getAllByLabelText("SIN (Canada) or SSN (US)")).toHaveLength(2);
    for (const l of ["RRSP / 401(k)", "TFSA / IRA", "RRSP / 401(k) loans (total)", "Taxes owing (CRA or IRS)"]) {
      expect(screen.getByLabelText(l)).toBeTruthy();
    }
    expect(screen.queryByLabelText("SIN")).toBeNull();
    expect(screen.queryByLabelText("Taxes owing / CRA debt")).toBeNull();
  });

  it("saves a US home address as parts plus the one-line string", async () => {
    render(<PersonalNetWorthForm applicationId="app-pnw" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    const home = within(screen.getByTestId("pnw-primary_home_address"));
    fireEvent.change(home.getByLabelText("Street"), { target: { value: "500 Pine Ave" } });
    fireEvent.change(home.getByLabelText("City"), { target: { value: "Austin" } });
    fireEvent.change(home.getByLabelText("Province / State"), { target: { value: "TX" } });
    expect((home.getByLabelText("Country") as HTMLSelectElement).value).toBe("US");
    fireEvent.change(home.getByLabelText("ZIP code"), { target: { value: "78701" } });
    fireEvent.change(screen.getByLabelText("Personal email"), { target: { value: "pat@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(lastSubmitted("net_worth_statement")).toBeTruthy());
    const fields = lastSubmitted("net_worth_statement").fields;
    expect(fields.primary_home_address).toBe("500 Pine Ave, Austin, TX 78701, United States");
    expect(fields).toMatchObject({
      primary_home_address_street: "500 Pine Ave",
      primary_home_address_city: "Austin",
      primary_home_address_region: "TX",
      primary_home_address_postal: "78701",
      primary_home_address_country: "US",
    });
  });

  it("puts an old one-line address in Street", async () => {
    saved.net_worth_statement = { data: { fields: { primary_home_address: "12 Bay St, Toronto ON" } } };
    render(<PersonalNetWorthForm applicationId="app-pnw" prefill={{ street: "Other St", city: "Calgary", province: "AB" }} onComplete={vi.fn()} />);
    const home = () => within(screen.getByTestId("pnw-primary_home_address"));
    await waitFor(() => expect((home().getByLabelText("Street") as HTMLInputElement).value).toBe("12 Bay St, Toronto ON"));
    expect((home().getByLabelText("City") as HTMLInputElement).value).toBe("");
  });
});

describe("Advisors", () => {
  it("uses Boreal Financial wording and the exact authorization text", async () => {
    const { container } = render(<AdvisorsForm applicationId="app-adv" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    const box = screen.getByRole("checkbox");
    expect(box.closest("label")?.textContent?.trim()).toBe(
      "I authorize Boreal Financial to discuss this proposed credit facility with any of its lending partners.",
    );
    expect(container.textContent).not.toMatch(/Accord/);
    expect(container.textContent).toContain("so Boreal Financial can coordinate with them");
    expect(screen.getByLabelText("Do you have CRA My Business (Canada) or an IRS online business account (US) set up?")).toBeTruthy();
  });
});
