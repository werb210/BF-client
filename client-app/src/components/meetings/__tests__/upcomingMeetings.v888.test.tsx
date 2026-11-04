// BF_CLIENT_v888_TEAMS_IN_APP - "Upcoming calls" on Home, joined inside the app.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const JOIN = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_test%40thread.v2/0";
const h = vi.hoisted(() => ({ apiCall: vi.fn(), openExternal: vi.fn(async (): Promise<void> => undefined) }));
vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/native/openExternal", () => ({ openExternal: h.openExternal }));
vi.mock("../TeamsMeetingCall", () => ({ default: ({ ticket }: { ticket: { displayName: string } }) => <div data-testid="acs-call">{ticket.displayName}</div> }));

import UpcomingMeetingsCard, { whenText } from "../UpcomingMeetingsCard";
import { messageFor } from "../teamsMeetingApi";

const soon = { id: "33333333-3333-4333-8333-333333333333", subject: "Teams meeting with Sam Example", startsAt: "2026-11-05T17:00:00.000Z", endsAt: "2026-11-05T17:30:00.000Z", staffFirstName: "Alex", joinUrl: JOIN, canJoinNow: true };

beforeEach(() => { h.apiCall.mockReset(); h.openExternal.mockClear(); });

describe("upcoming calls", () => {
  it("shows nothing when there are no Teams calls", async () => {
    h.apiCall.mockResolvedValue({ meetings: [], inAppVideo: true });
    const { container } = render(<UpcomingMeetingsCard />);
    await waitFor(() => expect(h.apiCall).toHaveBeenCalledWith("/api/meetings/upcoming"));
    expect(container.textContent).toBe("");
  });

  it("lists the call in Alberta time and joins it inside the app", async () => {
    h.apiCall.mockImplementation(async (url: string, init?: { body?: unknown }) => {
      if (url === "/api/meetings/upcoming") return { meetings: [soon], inAppVideo: true, timeZone: "America/Regina" };
      if (url === "/api/meetings/acs-token") { expect(init?.body).toEqual({ meetingId: soon.id }); return { token: "t", expiresOn: "x", acsUserId: "8:acs:x", displayName: "Sam Example", joinUrl: JOIN, subject: null, startsAt: null }; }
      throw new Error("unexpected " + url);
    });
    render(<UpcomingMeetingsCard />);
    expect(await screen.findByText("Teams video call with Alex")).toBeTruthy();
    expect(screen.getByText(/Thursday, November 5 at 11:00.*\(Alberta time\)/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("cmp-join-meeting"));
    expect((await screen.findByTestId("acs-call")).textContent).toContain("Sam Example");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByTestId("cmp-meeting-overlay")).toBeNull());
  });

  it("a call days away cannot be joined yet", async () => {
    h.apiCall.mockResolvedValue({ meetings: [{ ...soon, canJoinNow: false }], inAppVideo: true });
    render(<UpcomingMeetingsCard />);
    expect(await screen.findByText("You can join here from an hour before it starts.")).toBeTruthy();
    expect(screen.queryByTestId("cmp-join-meeting")).toBeNull();
  });

  it("if video in the app is unavailable, says so and offers Open in Teams", async () => {
    h.apiCall.mockImplementation(async (url: string) => {
      if (url === "/api/meetings/upcoming") return { meetings: [soon], inAppVideo: false };
      throw Object.assign(new Error("video_not_configured"), { status: 503 });
    });
    render(<UpcomingMeetingsCard />);
    fireEvent.click(await screen.findByTestId("cmp-join-meeting"));
    expect((await screen.findByTestId("cmp-meeting-error")).textContent).toContain("isn't available right now");
    fireEvent.click(screen.getByRole("button", { name: "Open in Teams" }));
    expect(h.openExternal).toHaveBeenCalledWith(JOIN);
  });

  it("plain-English messages for each refusal", () => {
    expect(messageFor(409)).toMatch(/an hour before/);
    expect(messageFor(404)).toMatch(/couldn't find that meeting/);
    expect(whenText(null)).toBe("");
  });
});
