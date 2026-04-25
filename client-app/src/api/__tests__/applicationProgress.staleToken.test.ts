import { beforeEach, describe, expect, it, vi } from "vitest";

const apiCallMock = vi.fn();

vi.mock("../client", () => ({
  apiCall: (...args: unknown[]) => apiCallMock(...args),
}));

vi.mock("@/api/auth", () => ({
  hasToken: () => true,
}));

import { saveApplicationStep } from "../applicationProgress";

describe("saveApplicationStep stale token handling", () => {
  beforeEach(() => {
    apiCallMock.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("clears stale token and redirects when API returns 410", async () => {
    localStorage.setItem("applicationToken", "stale-token");
    localStorage.setItem(
      "application_state",
      JSON.stringify({ applicationToken: "stale-token", applicationId: "app-123", foo: "bar" })
    );

    apiCallMock.mockRejectedValueOnce(new Error("API_ERROR_410 application_token_stale"));
    await saveApplicationStep({
      applicationId: "app-123",
      step: 4,
      data: { income: 100000 },
    });

    expect(localStorage.getItem("applicationToken")).toBeNull();
    expect(JSON.parse(localStorage.getItem("application_state") || "{}")).toMatchObject({
      applicationToken: null,
      applicationId: null,
      foo: "bar",
    });
    expect(sessionStorage.getItem("boreal_toast_message")).toBe(
      "Your previous application expired. Please start again."
    );
    expect(window.location.href).toContain("/apply/step-1");
  });
});
