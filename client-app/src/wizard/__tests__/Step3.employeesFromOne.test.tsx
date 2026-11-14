/* @vitest-environment jsdom */
// BF_CLIENT_EMPLOYEES_FROM_ONE - the employee count includes the owners: it starts at 1, never shows 0, and can be typed.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ update: vi.fn(), business: {} as Record<string, unknown> }));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual("react-router-dom")), useNavigate: () => vi.fn() }));
vi.mock("../../state/useApplicationStore", () => ({ useApplicationStore: () => ({ app: { currentStep: 3, applicationToken: "t", business: h.business, kyc: {}, productCategory: "term_loan" }, update: h.update }) }));
vi.mock("../../api/clientApp", () => ({ ClientAppAPI: { update: vi.fn(), start: vi.fn() } }));
vi.mock("../saveStepProgress", () => ({ persistApplicationStep: vi.fn(async () => undefined) }));
vi.mock("../../utils/track", () => ({ track: vi.fn() }));
vi.mock("../../components/StepHeader", () => ({ StepHeader: (): JSX.Element => <div /> }));
vi.mock("../../components/WizardLayout", () => ({ WizardLayout: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div> }));
vi.mock("../../components/ui/Card", () => ({ Card: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div> }));
vi.mock("../../components/ui/Button", () => ({ Button: ({ children, ...props }: any): JSX.Element => <button {...props}>{children}</button> }));
import Step3_Business from "../Step3_Business";

describe("step 3: number of employees", () => {
  let c: HTMLDivElement; let r: Root;
  beforeEach(() => { h.update.mockReset(); c = document.createElement("div"); document.body.appendChild(c); r = createRoot(c); });
  const field = () => c.querySelector('input[aria-label="Number of employees (including owners)"]') as HTMLInputElement;

  it("shows 1 and stores 1 when nothing has been entered", async () => {
    h.business = { businessName: "Acme" };
    await act(async () => { r.render(<Step3_Business />); });
    expect(field().value).toBe("1");
    expect(h.update).toHaveBeenCalledWith({ business: expect.objectContaining({ employees: 1 }) });
  });

  it("keeps what was entered, and minus never goes below 1", async () => {
    h.business = { businessName: "Acme", employees: 1 };
    await act(async () => { r.render(<Step3_Business />); });
    expect(h.update).not.toHaveBeenCalled();
    const minus = Array.from(c.querySelectorAll("button")).find((b) => b.textContent?.trim() === "−")!;
    await act(async () => { minus.click(); });
    expect(h.update).toHaveBeenLastCalledWith({ business: expect.objectContaining({ employees: 1 }) });
  });
});
