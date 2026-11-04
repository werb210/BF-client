// BF_CLIENT_v888_TEAMS_IN_APP - the client's Teams meetings with Boreal, and the token that lets them
// join one inside the app (web, iPhone, Android) without installing Teams. BF-Server only gives a
// token for meetings the signed-in client is invited to.
import { apiCall } from "@/api/client";

export type UpcomingMeeting = { id: string; subject: string | null; startsAt: string | null; endsAt: string | null; staffFirstName: string | null; joinUrl: string | null; canJoinNow: boolean };
export type MeetingTicket = { token: string; expiresOn: string; acsUserId: string; displayName: string; joinUrl: string; subject: string | null; startsAt: string | null };
export type TicketResult = { ok: true; ticket: MeetingTicket } | { ok: false; message: string; joinUrl: string | null };

const FALLBACK = "We couldn't start the video here. You can join with the Teams link in your invitation email.";

export function messageFor(status: number): string {
  if (status === 409) return "You can join from an hour before the meeting starts.";
  if (status === 404) return "We couldn't find that meeting. Please message your advisor.";
  if (status === 429) return "Too many tries. Please wait a few minutes and try again.";
  if (status === 503) return "Video in the app isn't available right now. You can join with Open in Teams.";
  return FALLBACK;
}

export async function fetchUpcomingMeetings(): Promise<{ meetings: UpcomingMeeting[]; inAppVideo: boolean; timeZone: string | null }> {
  const r = await apiCall<{ meetings?: UpcomingMeeting[]; inAppVideo?: boolean; timeZone?: string }>("/api/meetings/upcoming");
  return { meetings: Array.isArray(r?.meetings) ? r!.meetings : [], inAppVideo: r?.inAppVideo === true, timeZone: typeof r?.timeZone === "string" && r.timeZone ? r.timeZone : null };
}

export async function requestMeetingTicket(meetingId: string, fallbackJoinUrl: string | null): Promise<TicketResult> {
  try {
    const t = await apiCall<MeetingTicket>("/api/meetings/acs-token", { method: "POST", body: { meetingId } });
    if (!t || typeof t.token !== "string" || !t.token) return { ok: false, message: FALLBACK, joinUrl: fallbackJoinUrl };
    return { ok: true, ticket: t };
  } catch (e) {
    const status = Number((e as { status?: unknown } | null)?.status ?? 0);
    return { ok: false, message: messageFor(status), joinUrl: fallbackJoinUrl };
  }
}
