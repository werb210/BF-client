// BF_CLIENT_v823_CALENDAR - "Add to calendar" after booking a call with an advisor.
//   iPhone / iPad - the system event editor, already filled in (CalendarEventPlugin in AppDelegate.swift)
//   Android       - the phone's calendar app, already filled in (CalendarEventPlugin.java)
//   Browser       - an .ics file the calendar opens
import { Capacitor, registerPlugin } from "@capacitor/core";

export type CalendarEvent = { title: string; startMs: number; endMs: number; location?: string; notes?: string; url?: string };

interface CalendarEventPlugin {
  add(event: CalendarEvent): Promise<{ saved: boolean }>;
}

const CalendarEventNative = registerPlugin<CalendarEventPlugin>("CalendarEvent");

/** The call the client just booked: 30 minutes, phone or Teams. */
export function bookedCallEvent(input: { startsAt: string; kind: "phone" | "teams"; staffFirstName?: string | null; joinUrl?: string | null }): CalendarEvent | null {
  const startMs = Date.parse(input.startsAt);
  if (!Number.isFinite(startMs)) return null;
  const who = input.staffFirstName ? ` with ${input.staffFirstName}` : "";
  const teams = input.kind === "teams";
  const event: CalendarEvent = {
    title: `Boreal Financial call${who}`,
    startMs,
    endMs: startMs + 30 * 60 * 1000,
    location: teams ? "Microsoft Teams" : "Phone call",
    notes: teams ? "The Teams link is in the invitation Boreal emailed you." : "Your advisor will call you at the number you gave.",
  };
  if (teams && input.joinUrl && /^https:\/\//i.test(input.joinUrl)) event.url = input.joinUrl;
  return event;
}

function icsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function icsFor(event: CalendarEvent, now = Date.now()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Boreal Financial//Client//EN",
    "BEGIN:VEVENT",
    `UID:boreal-${event.startMs}@boreal.financial`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.startMs)}`,
    `DTEND:${icsDate(event.endMs)}`,
    `SUMMARY:${icsText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${icsText(event.location)}`);
  if (event.notes) lines.push(`DESCRIPTION:${icsText(event.notes)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:Boreal call", "END:VALARM", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export async function addToCalendar(event: CalendarEvent): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("CalendarEvent")) {
    try {
      return (await CalendarEventNative.add(event)).saved;
    } catch {
      return false;
    }
  }
  if (typeof document === "undefined") return false;
  const blob = new Blob([icsFor(event)], { type: "text/calendar" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "boreal-call.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
  return true;
}
