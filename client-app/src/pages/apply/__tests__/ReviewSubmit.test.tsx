import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import ReviewSubmit from "../ReviewSubmit";
import * as api from "../../../api/applications";

describe("ReviewSubmit", () => {
  it("enforces create -> upload -> submit with persisted applicationId", async () => {
    const createApplication = vi
      .spyOn(api, "createApplication")
      .mockResolvedValue({ id: "app_123", lender_id: "l1", product_id: "p1" } as never);
    const uploadDocuments = vi.spyOn(api, "uploadDocuments").mockResolvedValue(undefined);
    const submitApplication = vi.spyOn(api, "submitApplication").mockResolvedValue({ ok: true } as never);

    const state = {
      selectedProduct: {
        id: "p1",
        lender_id: "l1",
        name: "LOC",
        product_type: "LOC",
      },
    };

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);
    await act(async () => {
      root.render(<ReviewSubmit state={state as never} />);
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(createApplication).toHaveBeenCalledTimes(1);
    expect(uploadDocuments).toHaveBeenCalledWith("app_123", []);
    expect(submitApplication).toHaveBeenCalledWith("app_123");

    expect(createApplication.mock.invocationCallOrder[0]).toBeLessThan(uploadDocuments.mock.invocationCallOrder[0]);
    expect(uploadDocuments.mock.invocationCallOrder[0]).toBeLessThan(submitApplication.mock.invocationCallOrder[0]);

    root.unmount();
    container.remove();
  });

  it("fails fast when application id is missing", async () => {
    vi.spyOn(api, "createApplication").mockResolvedValue({} as never);
    const uploadDocuments = vi.spyOn(api, "uploadDocuments").mockResolvedValue(undefined);
    const submitApplication = vi.spyOn(api, "submitApplication").mockResolvedValue({ ok: true } as never);

    const state = {
      selectedProduct: {
        id: "p1",
        lender_id: "l1",
        name: "LOC",
        product_type: "LOC",
      },
    };

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);
    await act(async () => {
      root.render(<ReviewSubmit state={state as never} />);
    });

    const button = container.querySelector("button");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(uploadDocuments).not.toHaveBeenCalled();
    expect(submitApplication).not.toHaveBeenCalled();

    root.unmount();
    container.remove();
  });
});
