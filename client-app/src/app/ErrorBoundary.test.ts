/* @vitest-environment jsdom */
import * as React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function ThrowingChild(): React.ReactElement {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  const originalError = console.error;

  afterEach(() => {
    console.error = originalError;
  });

  it("renders fallback UI when child throws", async () => {
    console.error = vi.fn();

    const container = document.createElement("div");
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(ErrorBoundary, null, React.createElement(ThrowingChild))
      );
    });

    expect(container.textContent).toContain("Something went wrong");

    await act(async () => {
      root.unmount();
    });
  });

  it("contains runtime errors without crashing render tree", async () => {
    console.error = vi.fn();

    const container = document.createElement("div");
    const root = ReactDOM.createRoot(container);

    await expect(
      act(async () => {
        root.render(
          React.createElement(ErrorBoundary, null, React.createElement(ThrowingChild))
        );
      })
    ).resolves.toBeUndefined();

    expect(container.textContent).toContain("Something went wrong");

    await act(async () => {
      root.unmount();
    });
  });
});
