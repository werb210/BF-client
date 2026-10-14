// BF_CLIENT_v805_FORMS - behaviour of the phone-friendly CMP forms: blocks
// behind "+ Add ..." still submit empty, local drafts restore and clear, the
// CRA steps/button, and the Equipment Remove control. All render-based.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getFormResponse: vi.fn(),
  saveFormResponse: vi.fn(),
  submitFormResponse: vi.fn(),
}));
vi.mock("@/lib/api", () => api);

import RealEstateCollateralForm from "../RealEstateCollateralForm";
import EquipmentCollateralForm from "../EquipmentCollateralForm";
import AdvisorsForm from "../AdvisorsForm";
import CraAuthorizationForm, { CORPORATE_STEPS, CRA_MY_BUSINESS_URL, INDIVIDUAL_STEPS } from "../CraAuthorizationForm";
import FlinksConnectForm from "../FlinksConnectForm";
import { draftKey, mergeDraft } from "../../cmpFormKit";

const RE_KEYS = [
  "street", "city_province", "legal_address",
  // BF_CLIENT_v807_FORMS - address block parts + one-line address
  "address", "address_street", "address_city", "address_region", "address_postal", "address_country",
  "owner1", "owner1_marital", "owner2", "owner2_marital", "owner3", "owner3_marital",
  "matrimonial", "matrimonial_which", "rented", "rental_income_monthly", "renter_names",
  "property_type", "purchase_price", "purchase_when", "present_value", "value_method",
  "m1_lender", "m1_type", "m1_balance", "m1_charge", "m1_payment",
  "m2_lender", "m2_type", "m2_balance", "m2_charge", "m2_payment",
  "m3_lender", "m3_type", "m3_balance", "m3_charge", "m3_payment",
  "taxes_current", "other_charges", "other_charges_details", "other_disclosures",
].sort();

const submitted = () => api.submitFormResponse.mock.calls[api.submitFormResponse.mock.calls.length - 1][2];

beforeEach(() => {
  api.getFormResponse.mockReset().mockResolvedValue(null);
  api.saveFormResponse.mockReset().mockResolvedValue({});
  api.submitFormResponse.mockReset().mockResolvedValue({});
  try { window.localStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => cleanup());

describe("Real Estate: owners and mortgages behind + Add", () => {
  it("shows only owner 1 and the 1st mortgage, yet submits every hidden field empty", async () => {
    const onComplete = vi.fn();
    render(<RealEstateCollateralForm applicationId="app-re" onComplete={onComplete} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    expect(screen.getByTestId("re-0-owner-1")).toBeTruthy();
    expect(screen.queryByTestId("re-0-owner-2")).toBeNull();
    expect(screen.queryByTestId("re-0-mortgage-2")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const props = submitted().properties;
    expect(props).toHaveLength(1);
    expect(Object.keys(props[0]).sort()).toEqual(RE_KEYS);
    expect(props[0].owner2).toBe("");
    expect(props[0].m3_payment).toBe("");
  });

  it("reveals owner 2 and the 2nd mortgage on tap", async () => {
    render(<RealEstateCollateralForm applicationId="app-re" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "+ Add owner" }));
    expect(screen.getByTestId("re-0-owner-2")).toBeTruthy();
    expect(screen.queryByTestId("re-0-owner-3")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+ Add mortgage" }));
    expect(screen.getByTestId("re-0-mortgage-2")).toBeTruthy();
  });

  it("keeps saved owners and mortgages visible", async () => {
    api.getFormResponse.mockResolvedValue({ data: { properties: [{ owner3: "Pat Lee", m2_lender: "RBC" }] } });
    render(<RealEstateCollateralForm applicationId="app-re" onComplete={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("re-0-owner-3")).toBeTruthy());
    expect(screen.getByTestId("re-0-owner-2")).toBeTruthy();
    expect(screen.getByTestId("re-0-mortgage-2")).toBeTruthy();
    expect(screen.queryByTestId("re-0-mortgage-3")).toBeNull();
    expect(screen.queryByRole("button", { name: "+ Add owner" })).toBeNull();
  });
});

// BF_CLIENT_v808_ADVISORS_REMINDER - CPA, lawyer and insurance agent show from the start; A/R credit insurance
// stays behind + Add. Submitting with any of the three empty reminds the client; they can still submit.
describe("Advisors: the three key advisors, a reminder for any left empty", () => {
  it("shows CPA, lawyer and insurance agent; A/R credit insurance behind + Add", async () => {
    render(<AdvisorsForm applicationId="app-adv" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    for (const k of ["cpa", "attorney", "insurance"]) expect(screen.getByTestId("advisor-" + k)).toBeTruthy();
    expect(screen.queryByTestId("advisor-ar_credit_insurance")).toBeNull();
    expect(screen.getByLabelText("Attorney / Law Firm phone").getAttribute("type")).toBe("tel");
    expect(screen.getByRole("button", { name: "+ A/R Credit Insurance" })).toBeTruthy();
  });

  it("reminds the client about the missing ones, and lets them go back", async () => {
    const onComplete = vi.fn();
    render(<AdvisorsForm applicationId="app-adv" onComplete={onComplete} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("CPA / Accounting Firm firm"), { target: { value: "Smith CPA" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Advisors" }));
    const reminder = await screen.findByTestId("advisors-missing-reminder");
    expect(reminder.textContent).toContain("You haven't added your Attorney / Law Firm or Insurance Agent");
    expect(api.submitFormResponse).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("advisors-go-back"));
    expect(screen.queryByTestId("advisors-missing-reminder")).toBeNull();
    expect(document.activeElement?.id).toBe("adv-attorney-firm");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("submits without them when the client says so, still sending all four rows", async () => {
    const onComplete = vi.fn();
    render(<AdvisorsForm applicationId="app-adv" onComplete={onComplete} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Advisors" }));
    fireEvent.click(await screen.findByTestId("advisors-submit-anyway"));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const empty = { firm: "", contact: "", phone: "", email: "" };
    expect(submitted().advisors).toEqual({ cpa: empty, attorney: empty, insurance: empty, ar_credit_insurance: empty });
  });

  it("no reminder when all three are filled in", async () => {
    const onComplete = vi.fn();
    render(<AdvisorsForm applicationId="app-adv" onComplete={onComplete} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("CPA / Accounting Firm firm"), { target: { value: "Smith CPA" } });
    fireEvent.change(screen.getByLabelText("Attorney / Law Firm firm"), { target: { value: "Lee Law" } });
    fireEvent.change(screen.getByLabelText("Insurance Agent contact"), { target: { value: "Pat Agent" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Advisors" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.queryByTestId("advisors-missing-reminder")).toBeNull();
  });
});

describe("Equipment: one item shown, labelled Remove", () => {
  it("hides the empty second starter row but submits it as before", async () => {
    const onComplete = vi.fn();
    render(<EquipmentCollateralForm applicationId="app-eq" onComplete={onComplete} />);
    await screen.findByTestId("equip-item-0");
    expect(screen.queryByTestId("equip-item-1")).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(submitted().rows).toHaveLength(2);
  });

  it("+ Add equipment reveals the next item and Remove takes one away", async () => {
    const onComplete = vi.fn();
    render(<EquipmentCollateralForm applicationId="app-eq" onComplete={onComplete} />);
    await screen.findByTestId("equip-item-0");
    fireEvent.click(screen.getByRole("button", { name: "+ Add equipment" }));
    expect(screen.getByTestId("equip-item-1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ Add equipment" }));
    expect(screen.getByTestId("equip-item-2")).toBeTruthy();

    const removes = screen.getAllByRole("button", { name: /^Remove item/ });
    expect(removes).toHaveLength(3);
    expect(removes[0].textContent).toBe("Remove");
    expect(screen.queryByText("\u00d7")).toBeNull();
    fireEvent.click(removes[2]);
    expect(screen.queryByTestId("equip-item-2")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(submitted().rows).toHaveLength(2);
  });

  it("uses the money keypad for value fields", async () => {
    render(<EquipmentCollateralForm applicationId="app-eq" onComplete={vi.fn()} />);
    await screen.findByTestId("equip-item-0");
    expect(screen.getByLabelText("Est. value").getAttribute("inputmode")).toBe("decimal");
  });
});

describe("save as you go", () => {
  it("restores typed answers after the sheet closes and clears them on submit", async () => {
    const first = render(<EquipmentCollateralForm applicationId="app-draft" onComplete={vi.fn()} />);
    await screen.findByTestId("equip-item-0");
    fireEvent.change(screen.getByLabelText("Make"), { target: { value: "Kubota" } });
    await waitFor(() => {
      const raw = window.localStorage.getItem(draftKey("equipment_list", "app-draft"));
      expect(raw && JSON.parse(raw).rows[0].make).toBe("Kubota");
    }, { timeout: 2000 });
    first.unmount();

    // Server copy has a different, non-conflicting answer: both survive, and
    // the draft wins where it has a value.
    api.getFormResponse.mockResolvedValue({ data: { business_name: "Acme", rows: [{ make: "", model: "M7" }], notes: "" } });
    const onComplete = vi.fn();
    render(<EquipmentCollateralForm applicationId="app-draft" onComplete={onComplete} />);
    await screen.findByTestId("equip-item-0");
    expect((screen.getByLabelText("Make") as HTMLInputElement).value).toBe("Kubota");
    expect((screen.getByLabelText("Model") as HTMLInputElement).value).toBe("M7");
    expect((screen.getByLabelText("Business name") as HTMLInputElement).value).toBe("Acme");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(submitted().rows[0].make).toBe("Kubota");
    await act(async () => { await new Promise((r) => setTimeout(r, 600)); });
    expect(window.localStorage.getItem(draftKey("equipment_list", "app-draft"))).toBeNull();
  });

  it("flushes a pending draft when the form unmounts before the debounce", async () => {
    const view = render(<RealEstateCollateralForm applicationId="app-flush" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(within(screen.getByTestId("re-0-address")).getByLabelText("Street"), { target: { value: "1 Main St" } }); // BF_CLIENT_v807_FORMS
    view.unmount();
    const raw = window.localStorage.getItem(draftKey("real_estate_collateral_disclosure", "app-flush"));
    expect(raw && JSON.parse(raw).properties[0].street).toBe("1 Main St");
  });

  it("merge: prefill fills only empty draft fields", () => {
    expect(mergeDraft({ a: "server", b: "server", list: [{ x: "" }] }, { a: "", b: "draft", list: [{ x: "d" }, { x: "e" }] }))
      .toEqual({ a: "server", b: "draft", list: [{ x: "d" }, { x: "e" }] });
  });
});

describe("CRA authorization", () => {
  it("shows short numbered steps with Accord's business number and opens CRA My Business", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<CraAuthorizationForm applicationId="app-cra" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    const steps = () => screen.getByTestId("cra-steps").querySelectorAll("li");
    expect(steps()).toHaveLength(CORPORATE_STEPS.length);
    expect(screen.getByTestId("cra-steps").textContent).toContain("840554489");
    for (const s of [...CORPORATE_STEPS, ...INDIVIDUAL_STEPS]) expect(s.length).toBeLessThanOrEqual(90);

    fireEvent.click(screen.getByRole("button", { name: "Open CRA My Business" }));
    expect(open).toHaveBeenCalledWith(CRA_MY_BUSINESS_URL, "_blank", expect.any(String));
    expect(CRA_MY_BUSINESS_URL).toBe("https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-businesses/business-account.html");

    fireEvent.click(screen.getByRole("button", { name: "Individual / Sole Prop / Partnership" }));
    expect(steps()).toHaveLength(INDIVIDUAL_STEPS.length);
    expect(screen.getByText(/Boreal Financial is not alerted when you finish/)).toBeTruthy();

    const confirm = screen.getByRole("button", { name: "Confirm Authorization" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm.disabled).toBe(false);
    open.mockRestore();
  });
});

describe("Flinks", () => {
  it("does not talk about tabs", async () => {
    const { container } = render(<FlinksConnectForm applicationId="app-fl" onComplete={vi.fn()} />);
    await waitFor(() => expect(api.getFormResponse).toHaveBeenCalled());
    expect(container.textContent).not.toMatch(/\btab\b/i);
    expect(container.textContent).toContain("come back here and confirm below");
    expect(container.querySelector(".cmpf-check input[type=checkbox]")).toBeTruthy();
  });
});
