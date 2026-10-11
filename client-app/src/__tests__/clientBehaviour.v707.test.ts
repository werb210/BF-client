// BF_CLIENT_BEHAVIOUR_v707 / BF_CLIENT_READABILITY_v707
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const journey = vi.hoisted(() => ({ trackJourney: vi.fn(), trackJourneyPageview: vi.fn() }));
vi.mock("@/lib/journey", () => journey);

import { clientBehaviourRoute, initClientBehaviour, wizardStepFromPath } from "@/lib/clientBehaviour";
import RouteTracker from "@/components/RouteTracker";
import { tokens } from "@/styles/tokens";
import { components } from "@/styles/components";
import { contrastRatio } from "@/styles/a11yColors";

type Sent = { type: string; step?: string; meta: Record<string, unknown> };
const sent = (): Sent[] => journey.trackJourney.mock.calls.map((c) => c[0] as Sent);

function field(name: string): HTMLInputElement {
  const input = document.createElement("input");
  input.name = name;
  document.body.appendChild(input);
  return input;
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeAll(() => {
  initClientBehaviour();
});

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  journey.trackJourney.mockReset();
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/apply/step-3");
});

describe("client behaviour tracking", () => {
  it("reads the wizard step from the route", () => {
    expect(wizardStepFromPath("/apply/step-3")).toBe("3");
    expect(wizardStepFromPath("/portal")).toBe("");
  });

  it("records clicks with the button label and the step", () => {
    const btn = document.createElement("button");
    btn.textContent = "Continue";
    document.body.appendChild(btn);
    btn.click();
    expect(sent()).toContainEqual(expect.objectContaining({ type: "click", step: "3", meta: { label: "Continue" } }));
  });

  it("records a completed field once, by name", () => {
    const input = field("legalName");
    typeInto(input, "A");
    typeInto(input, "Ab");
    const completes = sent().filter((e) => e.type === "field_complete" && e.meta.field === "legalName");
    expect(completes).toHaveLength(1);
    expect(completes[0].step).toBe("3");
  });

  it("records the field someone stopped on when they leave the wizard", () => {
    typeInto(field("businessPhone"), "4035550000");
    clientBehaviourRoute("/portal");
    expect(sent()).toContainEqual(
      expect.objectContaining({ type: "field_abandon", step: "3", meta: { field: "businessPhone", reason: "left_wizard" } })
    );
  });

  it("never reads what an applicant types", () => {
    const secret = "SECRET-046-454-286";
    typeInto(field("sinNumber"), secret);
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Next");
    document.body.appendChild(btn);
    btn.click();
    clientBehaviourRoute("/portal");
    expect(sent().length).toBeGreaterThan(0);
    expect(JSON.stringify(journey.trackJourney.mock.calls)).not.toContain(secret);
  });

  it("follows every route: leaving the wizard through the router reports the abandoned field", async () => {
    typeInto(field("annualRevenue"), "100000");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(createElement(MemoryRouter, { initialEntries: ["/portal"] }, createElement(RouteTracker)));
    });
    expect(sent()).toContainEqual(
      expect.objectContaining({ type: "field_abandon", meta: { field: "annualRevenue", reason: "left_wizard" } })
    );
    act(() => root.unmount());
  });
});

describe("readability", () => {
  it("gold text is readable on white and the page background", () => {
    expect(contrastRatio(tokens.colors.accentInk, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.colors.accentInk, tokens.colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("the gold step eyebrow uses the readable ink, not the accent", () => {
    expect(components.form.eyebrow.color).toBe(tokens.colors.accentInk);
  });
});
