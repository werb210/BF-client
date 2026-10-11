// BF_CLIENT_APP_GONE_v736
// When the application the portal points at no longer exists (deleted, or not
// this client's), every call answered 403/404 and the page kept polling behind
// an empty screen. Two refused answers in a row mean it is gone.
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { apiCallsTo, apiError, goTo, refocus, renderPortal, setApi } from "./miniPortalHarness";

const GONE = "We can't find this application";

describe("a client portal pointing at an application that no longer exists", () => {
  it("says so instead of showing an empty portal once the offers read is refused twice in a row", async () => {
    setApi({ "/api/client/offers": apiError(404, "Application not found") });
    await renderPortal();
    expect(screen.getByTestId("mp-app-gone").textContent).toContain(GONE);
    expect(screen.getByRole("button", { name: "Start a new application" })).toBeTruthy();
    expect(screen.queryByText("Chat with Boreal Staff")).toBeNull();
  });

  it("stops polling once the application is gone", async () => {
    setApi({ "/api/client/offers": apiError(403) });
    await renderPortal();
    expect(screen.getByTestId("mp-app-gone")).toBeTruthy();
    const before = { stage: apiCallsTo("/api/client/application-stage").length, offers: apiCallsTo("/api/client/offers").length, typing: apiCallsTo("/api/client/messages/typing").length };
    await refocus();
    await refocus();
    expect(apiCallsTo("/api/client/application-stage").length).toBe(before.stage);
    expect(apiCallsTo("/api/client/offers").length).toBe(before.offers);
    expect(apiCallsTo("/api/client/messages/typing").length).toBe(before.typing);
  });

  it("recognises a refusal from the error text when no status is attached", async () => {
    setApi({ "/api/client/offers": new Error("API 404") });
    await renderPortal();
    expect(screen.getByTestId("mp-app-gone")).toBeTruthy();
  });

  it("does not count other failures, however many", async () => {
    setApi({ "/api/client/offers": apiError(500) });
    await renderPortal();
    await refocus();
    await refocus();
    expect(screen.queryByTestId("mp-app-gone")).toBeNull();
    expect(screen.getByText("Chat with Boreal Staff")).toBeTruthy();
  });

  it("needs the refusals in a row: a good answer in between resets the count", async () => {
    let n = 0;
    // Mount runs two loads; answer refused, ok, refused, ok...
    setApi({ "/api/client/offers": () => { n += 1; return n % 2 === 1 ? apiError(404) : { items: [] }; } });
    await renderPortal();
    console.log("after mount", n);
    await refocus();
    console.log("after 1", n);
    await refocus();
    console.log("after 2", n);
    expect(n).toBeGreaterThanOrEqual(4);
    expect(screen.queryByTestId("mp-app-gone")).toBeNull();
  });

  it("resets when the client switches to another application", async () => {
    setApi({ "/api/client/offers": (url: string) => (url.includes("applicationId=app-1") ? apiError(404) : { items: [] }) });
    await renderPortal({ path: "/application/app-1" });
    expect(screen.getByTestId("mp-app-gone")).toBeTruthy();
    await goTo("/application/app-2");
    expect(screen.queryByTestId("mp-app-gone")).toBeNull();
    expect(screen.getByText("Chat with Boreal Staff")).toBeTruthy();
    expect(apiCallsTo("/api/client/offers?applicationId=app-2").length).toBeGreaterThan(0);
  });
});
