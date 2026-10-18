// BF_CLIENT_v823 - lock-screen status words, Add to calendar, the Book a call shortcut and Android notification taps.
import { describe, expect, it } from "vitest";
import { statusContent } from "../applicationStatus";
import { bookedCallEvent, icsFor } from "../calendar";
import { parseNativeUrl } from "../deepLinks";
import { routeForAndroidTap } from "../pushListener";

const APP = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";

describe("v823 lock-screen status", () => {
  it("uses the same steps and words as BF-Server's pushes", () => {
    expect(statusContent("in_review")).toEqual({ stage: "In Review", step: 2, totalSteps: 7, action: "We're working on it", final: false });
    expect(statusContent("Documents Required")).toMatchObject({ step: 3, action: "Upload your documents" });
    expect(statusContent("Accepted")).toMatchObject({ stage: "Funded", step: 7, final: true });
    expect(statusContent("declined")).toMatchObject({ stage: "Closed", final: true });
  });
});

describe("v823 Add to calendar", () => {
  it("makes a 30-minute event for the booked call", () => {
    const event = bookedCallEvent({ startsAt: "2026-10-20T16:00:00.000Z", kind: "teams", staffFirstName: "Andrew", joinUrl: "https://teams.microsoft.com/l/x" });
    expect(event).toMatchObject({ title: "Boreal Financial call with Andrew", location: "Microsoft Teams", url: "https://teams.microsoft.com/l/x" });
    expect(event!.endMs - event!.startMs).toBe(30 * 60 * 1000);
    expect(bookedCallEvent({ startsAt: "not a date", kind: "phone" })).toBeNull();
    expect(bookedCallEvent({ startsAt: "2026-10-20T16:00:00Z", kind: "phone", joinUrl: "javascript:alert(1)" })?.url).toBeUndefined();
  });

  it("writes a valid .ics for the browser", () => {
    const ics = icsFor({ title: "Call, with Andrew", startMs: Date.UTC(2026, 9, 20, 16), endMs: Date.UTC(2026, 9, 20, 16, 30), notes: "Line 1\nLine 2" }, Date.UTC(2026, 9, 18));
    expect(ics).toContain("DTSTART:20261020T160000Z");
    expect(ics).toContain("DTEND:20261020T163000Z");
    expect(ics).toContain("SUMMARY:Call\\, with Andrew");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
  });
});

describe("v823 shortcuts and notification taps", () => {
  it("opens Book a call from the app-icon shortcut", () => {
    expect(parseNativeUrl("borealclient://book-call")).toBe("/portal?section=book-call");
  });

  it("routes an Android notification tap like an iPhone one", () => {
    expect(routeForAndroidTap({ url: "borealclient://documents", actionId: "UPLOAD_NOW", applicationId: APP })).toBe(`/application/${APP}?section=documents`);
    expect(routeForAndroidTap({ url: "borealclient://messages", applicationId: APP })).toBe(`/application/${APP}?section=messages`);
    expect(routeForAndroidTap({ url: "javascript:alert(1)" })).toBe("/portal");
    expect(routeForAndroidTap(undefined)).toBeNull();
  });
});
