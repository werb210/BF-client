import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useApplicationStore } from "../useApplicationStore";

describe("BF_CLIENT_WIZARD_NAV_FIX_v55b — single canonical localStorage key", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes only application_state on update", async () => {
    let api: ReturnType<typeof useApplicationStore> | null = null;
    const div = document.createElement("div");
    const root = createRoot(div);

    function Probe(): null {
      api = useApplicationStore();
      return null;
    }

    await act(async () => {
      root.render(<Probe />);
    });

    await act(async () => {
      api!.update({ currentStep: 2 });
    });

    expect(localStorage.getItem("application_state")).not.toBeNull();
    expect(localStorage.getItem("boreal_draft")).toBeNull();
    expect(localStorage.getItem("boreal_client_draft")).toBeNull();
    expect(localStorage.getItem("application_data")).toBeNull();

    root.unmount();
  });

  it("migrates boreal_draft to application_state and clears legacy key", async () => {
    localStorage.setItem("boreal_draft", JSON.stringify({ currentStep: 4 }));
    const div = document.createElement("div");
    const root = createRoot(div);

    function Probe(): null {
      useApplicationStore();
      return null;
    }

    await act(async () => {
      root.render(<Probe />);
    });

    expect(localStorage.getItem("application_state")).not.toBeNull();
    expect(localStorage.getItem("boreal_draft")).toBeNull();
    root.unmount();
  });
});
