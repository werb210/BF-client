// BF_CLIENT_CONSENT_v175 - these controls make a typed signature legally
// binding. A checkbox nobody can see is not an informed consent.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationData } from "@/types/application";
import { completeApplication } from "@/test/fixtures/completeApplication";
import { tokens } from "@/styles/tokens";

const h = vi.hoisted(() => ({
  app: null as unknown as ApplicationData,
  update: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: h.app, update: h.update }),
  clearStoredApplication: vi.fn(),
}));
vi.mock("@/api/client", () => ({ apiCall: vi.fn(async () => ({})) }));
vi.mock("@/api/clientApp", () => ({
  ClientAppAPI: { status: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
}));

import { Checkbox } from "@/components/ui/Checkbox";
import { Step6_Review } from "@/wizard/Step6_Review";

/** The value jsdom stores for `prop: value`, so colours compare as rgb(). */
function cssValue(prop: "border" | "borderRadius" | "width", value: string): string {
  const probe = document.createElement("div");
  probe.style[prop] = value;
  return probe.style[prop];
}

let host: HTMLDivElement;
let root: Root;

async function render(el: ReturnType<typeof createElement>): Promise<void> {
  await act(async () => {
    root.render(el);
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  h.update.mockReset();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("the checkbox is visible", () => {
  it("has a heavier edge than a text input", async () => {
    await render(createElement(Checkbox, { checked: false, onChange: () => undefined }));
    const box = host.querySelector("input") as HTMLInputElement;
    expect(box.style.border).toBe(cssValue("border", `2px solid ${tokens.colors.textSecondary}`));
  });

  it("is 20px, not 18px", async () => {
    await render(createElement(Checkbox, { checked: false, onChange: () => undefined }));
    const box = host.querySelector("input") as HTMLInputElement;
    expect(box.style.width).toBe("20px");
    expect(box.style.height).toBe("20px");
  });
});

describe("each consent reads as a required action", () => {
  function agreeRow(): HTMLElement {
    const row = host.querySelector('[data-testid="agree-all-terms"]');
    if (!row) throw new Error("agree-all-terms row not rendered");
    return row as HTMLElement;
  }

  it("sits in its own bordered, clickable row", async () => {
    h.app = completeApplication({ termsAccepted: false, shareAuthorization: false, infoConfirmed: false });
    await render(createElement(Step6_Review));
    const row = agreeRow();
    expect(row.tagName).toBe("LABEL");
    expect(row.style.borderRadius).toBe(tokens.radii.md);
    expect(row.style.cursor).toBe("pointer");
    expect(row.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it("changes state visibly when ticked", async () => {
    // BF_CLIENT_SMS_DISCLOSURE_v690 - one combined box
    h.app = completeApplication({ termsAccepted: false, shareAuthorization: false, infoConfirmed: false });
    await render(createElement(Step6_Review));
    expect(agreeRow().style.border).toBe(cssValue("border", `1px solid ${tokens.colors.border}`));

    h.app = completeApplication({ termsAccepted: true, shareAuthorization: true, infoConfirmed: true });
    await render(createElement(Step6_Review));
    expect(agreeRow().style.border).toBe(cssValue("border", `1px solid ${tokens.colors.accent}`));
  });
});
