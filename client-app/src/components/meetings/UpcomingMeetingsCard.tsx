// BF_CLIENT_v888_TEAMS_IN_APP - "Upcoming calls" on the client portal Home: the client's Teams meetings with
// Boreal (calls they booked and meetings their advisor scheduled), each with "Join meeting" that opens the
// video right here in the app (web, iPhone, Android), no Teams install needed. The client waits in the
// Teams lobby until their advisor lets them in. "Open in Teams" stays as the fallback.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchUpcomingMeetings, requestMeetingTicket, type MeetingTicket, type UpcomingMeeting } from "./teamsMeetingApi";
import { openExternal } from "@/native/openExternal";
import "../cmp/cmp.css";

const TeamsMeetingCall = lazy(() => import("./TeamsMeetingCall"));
// Alberta is UTC-6 all year from 2026; America/Regina gives that on every device (BF-Server BF_SERVER_ALBERTA_TIME_v743).
const DEFAULT_TZ = "America/Regina";

type Stage = { kind: "closed" } | { kind: "loading"; m: UpcomingMeeting } | { kind: "call"; m: UpcomingMeeting; ticket: MeetingTicket } | { kind: "error"; m: UpcomingMeeting; message: string; joinUrl: string | null };

export function whenText(iso: string | null, tz: string = DEFAULT_TZ): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "long", month: "long", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
  return day + " at " + time + " (Alberta time)";
}

export default function UpcomingMeetingsCard({ refreshKey }: { refreshKey?: number }): JSX.Element | null {
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [tz, setTz] = useState(DEFAULT_TZ);
  const [stage, setStage] = useState<Stage>({ kind: "closed" });
  const close = useCallback(() => setStage({ kind: "closed" }), []);

  useEffect(() => {
    let alive = true;
    fetchUpcomingMeetings()
      .then((r) => { if (!alive) return; setMeetings(r.meetings); if (r.timeZone) setTz(r.timeZone); })
      .catch((e) => { if (alive) setMeetings([]); console.warn("[meetings] upcoming failed", e); });
    return () => { alive = false; };
  }, [refreshKey]);

  if (meetings.length === 0) return null;

  const join = async (m: UpcomingMeeting) => {
    setStage({ kind: "loading", m });
    const r = await requestMeetingTicket(m.id, m.joinUrl);
    if (r.ok === true) setStage({ kind: "call", m, ticket: r.ticket });
    else { const f = r as Extract<typeof r, { ok: false }>; setStage({ kind: "error", m, message: f.message, joinUrl: f.joinUrl }); }
  };

  return (
    <section className="cmpx-card" data-cmp-tab="home" data-testid="cmp-upcoming-meetings" aria-label="Upcoming calls">
      <div className="cmpx-eyebrow">{meetings.length === 1 ? "Your upcoming call" : "Your upcoming calls"}</div>
      {meetings.slice(0, 3).map((m) => (
        <div key={m.id} style={{ padding: "8px 0" }} data-testid="cmp-upcoming-meeting">
          <div style={{ fontWeight: 700, color: "#0B1F3A" }}>Teams video call{m.staffFirstName ? " with " + m.staffFirstName : ""}</div>
          <div className="cmpx-muted" style={{ margin: "2px 0 8px" }}>{whenText(m.startsAt, tz)}</div>
          {m.canJoinNow ? (
            <button type="button" className="cmpx-btn cmpx-btn--block" onClick={() => void join(m)} data-testid="cmp-join-meeting">Join meeting</button>
          ) : (
            <p className="cmpx-muted" style={{ margin: 0, fontSize: 13 }}>You can join here from an hour before it starts.</p>
          )}
        </div>
      ))}
      {stage.kind !== "closed" ? createPortal(
        <div role="dialog" aria-modal="true" aria-label="Teams video call" data-testid="cmp-meeting-overlay"
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#11100f", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", color: "#fff" }}>
            <strong style={{ flex: 1 }}>Call{stage.m.staffFirstName ? " with " + stage.m.staffFirstName : ""}</strong>
            <button type="button" onClick={close} style={{ background: "transparent", color: "#fff", border: "1px solid #666", borderRadius: 8, padding: "6px 12px" }}>Close</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {stage.kind === "loading" ? <p style={{ color: "#fff", padding: 24 }}>Getting the call ready...</p> : null}
            {stage.kind === "error" ? (
              <div style={{ color: "#fff", padding: 24 }} data-testid="cmp-meeting-error">
                <p style={{ marginTop: 0 }}>{stage.message}</p>
                {stage.joinUrl ? <button type="button" className="cmpx-btn" onClick={() => void openExternal(stage.joinUrl!)}>Open in Teams</button> : null}
              </div>
            ) : null}
            {stage.kind === "call" ? (
              <Suspense fallback={<p style={{ color: "#fff", padding: 24 }}>Loading video...</p>}>
                <TeamsMeetingCall ticket={stage.ticket} onEnded={close} />
              </Suspense>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
