// BF_CLIENT_UI_v169 - buttons were inline-styled, so they had no hover, active
// or focus states at all. Guard the classes and the palette.
// The :hover/:active/:focus-visible/:disabled rules live in button.css, which
// jsdom does not apply; the disabled colour pair is checked for contrast in
// src/styles/__tests__/contrast.v789.test.ts.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Button, SecondaryButton } from "@/components/ui/Button";
import { tokens } from "@/styles/tokens";

let host: HTMLDivElement;
let root: Root;

async function renderButton(el: ReturnType<typeof createElement>): Promise<HTMLButtonElement> {
  await act(async () => {
    root.render(el);
  });
  const btn = host.querySelector("button");
  if (!btn) throw new Error("button not rendered");
  return btn;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("button interactive states", () => {
  it("renders classes rather than inline colour", async () => {
    const btn = await renderButton(createElement(Button, null, "Go"));
    expect(btn.classList.contains("bf-btn")).toBe(true);
    expect(btn.classList.contains("bf-btn--primary")).toBe(true);
    expect(btn.getAttribute("style")).toBeNull();
  });

  it("styles each variant by class and keeps a caller's className", async () => {
    const btn = await renderButton(createElement(SecondaryButton, { className: "extra" }, "Back"));
    expect(btn.className).toBe("bf-btn bf-btn--secondary extra");
  });

  it("disables through the disabled attribute, not a faded inline opacity", async () => {
    const btn = await renderButton(createElement(Button, { disabled: true }, "Go"));
    expect(btn.disabled).toBe(true);
    expect(btn.style.opacity).toBe("");
  });

  it("is disabled and says so while loading", async () => {
    const btn = await renderButton(createElement(Button, { loading: true }, "Go"));
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe("Loading...");
  });

  it("still lets callers override with style", async () => {
    const btn = await renderButton(createElement(Button, { style: { maxWidth: "240px", background: "red" } }, "Go"));
    expect(btn.style.maxWidth).toBe("240px");
    expect(btn.style.background).toBe("red");
  });
});

describe("brand palette", () => {
  it("tokens use the BF-Website navy and gold", () => {
    expect(tokens.colors.primary).toBe("#0B1F3A");
    expect(tokens.colors.accent).toBe("#BF9B49");
  });

  it("the old generic indigo is gone", () => {
    const values = JSON.stringify(tokens);
    expect(values).not.toContain("rgb(30 58 138)");
    expect(values).not.toContain("rgb(29 78 216)");
  });
});
