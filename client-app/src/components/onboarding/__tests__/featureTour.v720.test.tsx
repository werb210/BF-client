// BF_CLIENT_FEATURE_TOUR_v720
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const native = { value: true, platform: "ios" };
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.value, getPlatform: () => native.platform } }));
const push = { state: "prompt" as string, registered: false };
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: {
  checkPermissions: async () => ({ receive: push.state }),
  requestPermissions: async () => { push.state = "granted"; return { receive: "granted" }; },
  register: async () => { push.registered = true; },
} }));
const bio = { available: true, enrolled: false, enrollCalls: 0 };
vi.mock("@/native/deviceSignIn", () => ({
  biometryStatus: async () => ({ native: true, available: bio.available, reason: "" }),
  isEnrolled: async () => bio.enrolled,
  enrollDeviceWithReason: async () => { bio.enrollCalls += 1; return { ok: true }; },
}));
vi.mock("@/utils/analytics", () => ({ trackEvent: vi.fn() }));
import FeatureTour, { TOUR_KEY, tourSteps } from "../FeatureTour";

beforeEach(() => { localStorage.clear(); native.value = true; native.platform = "ios"; push.state = "prompt"; push.registered = false; bio.available = true; bio.enrolled = false; bio.enrollCalls = 0; });

describe("feature tour", () => {
  it("shows once in the app and turns notifications on from the step", async () => {
    render(<FeatureTour />);
    expect(await screen.findByText("Welcome to Boreal Financial")).toBeTruthy();
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Turn on notifications"));
    await waitFor(() => expect(push.registered).toBe(true));
    expect(await screen.findByText("Notifications are on.")).toBeTruthy();
  });
  it("can switch Face ID on, and skipping marks it seen so it never shows again", async () => {
    const { unmount } = render(<FeatureTour />);
    await screen.findByText("Welcome to Boreal Financial");
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Not now"));
    fireEvent.click(await screen.findByText("Turn on"));
    await waitFor(() => expect(bio.enrollCalls).toBe(1));
    fireEvent.click(screen.getByText("Skip tour"));
    expect(localStorage.getItem(TOUR_KEY)).toBe("done");
    unmount();
    render(<FeatureTour />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("feature-tour")).toBeNull();
  });
  it("never shows on the website", async () => {
    native.value = false;
    render(<FeatureTour />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("feature-tour")).toBeNull();
  });
  it("leaves out Face ID when the phone has none or it is already on, and words steps per platform", () => {
    expect(tourSteps("ios", { faceId: false }).map((s) => s.id)).not.toContain("faceid");
    expect(tourSteps("android", { faceId: true }).find((s) => s.id === "widget")!.body).toContain("Widgets");
    expect(tourSteps("ios", { faceId: true }).find((s) => s.id === "widget")!.body).toContain("Add Widget");
    expect(tourSteps("ios", { faceId: true }).map((s) => s.id)).toContain("call");
  });
});
