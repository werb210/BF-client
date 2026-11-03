// BF_CLIENT_v869_SETTINGS_PACK_BOOKING - public booking pages in Boreal's look:
//   /book/<name>          one staff member's page
//   /book/team            the team page (round robin)
//   /book/manage/<token>  the client's own link: see, cancel or reschedule
// BF-Server /api/booking. Text reminders need the client's tick (express consent, recorded with its wording).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { useBrand } from "./borealBrand";
import { dayKey, dayLabel, publicApi, timeLabel } from "./publicApi";

type MeetingType = { id: string | null; slug: string; name: string; description: string | null; duration_min: number; kind: "phone" | "video" };
type Page = { company: string; team: boolean; staff: { id: string; firstName: string } | null; meetingTypes: MeetingType[]; timeZone: string; zoneLabel: string };
type Slot = { startsAt: string; staffIds: string[] };
type Booked = { booking: { startsAt: string; staffFirstName: string | null; kind: "phone" | "teams"; joinUrl: string | null } };

const NAVY = "#0B1F3A";
const page: CSSProperties = { maxWidth: 640, margin: "0 auto", padding: "24px 16px 120px", color: "#111827", fontSize: 16, lineHeight: 1.5 };
const cardStyle: CSSProperties = { background: "#ffffff", border: "1px solid #E4EAF2", borderRadius: 16, padding: 16, margin: "0 0 12px" };
const label: CSSProperties = { display: "block", fontSize: 15, fontWeight: 600, margin: "10px 0 4px", color: "#1F2937" };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 10, border: "1px solid #94A3B8", fontSize: 16, color: "#111827", background: "#ffffff" };
const errorBox: CSSProperties = { background: "#FEE2E2", color: "#7F1D1D", borderRadius: 10, padding: "10px 12px", margin: "10px 0" };
const okBox: CSSProperties = { background: "#DCFCE7", color: "#14532D", borderRadius: 10, padding: "10px 12px", margin: "10px 0" };
export const SMS_CONSENT_TEXT = "Text me reminders about this booking. Message and data rates may apply. Reply STOP to opt out.";

function useButton(): { primary: CSSProperties; ghost: CSSProperties } {
  const brand = useBrand();
  const bg = /^#[0-9a-f]{6}$/i.test(brand.primary_color) ? brand.primary_color : NAVY;
  return {
    primary: { minHeight: 48, padding: "0 18px", borderRadius: 12, border: 0, background: bg, color: "#ffffff", fontSize: 16, fontWeight: 600, cursor: "pointer" },
    ghost: { minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid #94A3B8", background: "#ffffff", color: NAVY, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  };
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const brand = useBrand();
  return (
    <header style={{ marginBottom: 16 }}>
      {brand.logo_url ? <img src={brand.logo_url} alt={brand.company_name} style={{ maxHeight: 40, maxWidth: 200, marginBottom: 8 }} /> : <div style={{ fontWeight: 700, color: NAVY }}>{brand.company_name}</div>}
      <h1 style={{ fontSize: 24, margin: "4px 0", color: NAVY }}>{title}</h1>
      {subtitle ? <p style={{ margin: 0, color: "#374151" }}>{subtitle}</p> : null}
    </header>
  );
}

/** Day buttons, then that day's times. */
function SlotPicker({ slots, tz, value, onChange }: { slots: Slot[]; tz: string; value: string; onChange: (iso: string) => void }) {
  const btn = useButton();
  const days = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) { const k = dayKey(s.startsAt, tz); m.set(k, [...(m.get(k) ?? []), s]); }
    return [...m.entries()];
  }, [slots, tz]);
  const [day, setDay] = useState("");
  useEffect(() => { if (!day && days[0]) setDay(days[0][0]); }, [days, day]);
  if (!slots.length) return <p>No times are open right now. Please try again later.</p>;
  const today = days.find(([k]) => k === day)?.[1] ?? [];
  return (
    <div>
      <div role="group" aria-label="Day" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
        {days.map(([k, list]) => (
          <button key={k} type="button" aria-pressed={k === day} onClick={() => setDay(k)} style={k === day ? btn.primary : btn.ghost}>{dayLabel(list[0]!.startsAt, tz)}</button>
        ))}
      </div>
      <div role="group" aria-label="Time" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {today.map((s) => (
          <button key={s.startsAt} type="button" aria-pressed={s.startsAt === value} onClick={() => onChange(s.startsAt)} style={s.startsAt === value ? btn.primary : btn.ghost}>{timeLabel(s.startsAt, tz)}</button>
        ))}
      </div>
    </div>
  );
}

// BF_CLIENT_v885_BOOKING_ORIGINAL - the client-app booking page duplicated the website's (www.boreal.financial/book-todd).
// Old links forward there; only the client's own cancel / reschedule page stays here.
export function WebsiteBookingRedirect() {
  const { slug = "" } = useParams();
  const name = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  useEffect(() => { window.location.replace(name && name !== "team" ? `https://www.boreal.financial/book-${name}` : "https://www.boreal.financial/contact"); }, [name]);
  return <p style={{ padding: 24 }}>Opening the booking page...</p>;
}

type Managed = { company: string; zoneLabel: string; timeZone: string; booking: { status: string; startsAt: string; durationMin: number; kind: string; staffFirstName: string | null; meetingName: string; meetingTypeId: string | null; staffId: string | null; joinUrl: string | null; canChange: boolean } };

export function ManageBookingPage() {
  const { token = "" } = useParams();
  const btn = useButton();
  const [m, setM] = useState<Managed | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = () => publicApi<Managed>(`/api/booking/manage/${encodeURIComponent(token)}`).then(setM).catch((e) => setErr(e?.status === 404 ? "We can't find this booking." : "Please try again later."));
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <main style={page}>{err ? <div style={errorBox} role="alert">{err}</div> : <p>Loading...</p>}</main>;
  const b = m.booking;
  const cancel = async () => {
    setErr(null);
    try { await publicApi(`/api/booking/manage/${encodeURIComponent(token)}/cancel`, { method: "POST", body: {} }); setOk("Your booking is cancelled. We've emailed you a confirmation."); await load(); }
    catch (e: any) { setErr(e?.message ?? "Could not cancel."); }
  };
  const showTimes = async () => {
    setErr(null);
    try {
      const r = await publicApi<{ slots: Slot[] }>(`/api/booking/slots?staff=${encodeURIComponent(b.staffId ?? "any")}${b.meetingTypeId ? `&type=${encodeURIComponent(b.meetingTypeId)}` : ""}`);
      setSlots(r.slots);
    } catch (e: any) { setErr(e?.message ?? "Could not load times."); }
  };
  const move = async () => {
    setErr(null);
    try {
      await publicApi(`/api/booking/manage/${encodeURIComponent(token)}/reschedule`, { method: "POST", body: { startsAt } });
      setOk(`Moved to ${dayLabel(startsAt, m.timeZone)} at ${timeLabel(startsAt, m.timeZone)}. A new confirmation (with a new change link) is in your email.`);
      setSlots(null); await load();
    } catch (e: any) { setErr(e?.status === 409 ? "That time was just taken. Please pick another." : (e?.message ?? "Could not reschedule.")); }
  };
  return (
    <main style={page} data-testid="manage-booking">
      <Header title="Your booking" />
      <section style={cardStyle}>
        <p style={{ margin: 0 }}><strong>{b.meetingName}</strong> with {b.staffFirstName || m.company}</p>
        <p style={{ margin: "4px 0" }}>{dayLabel(b.startsAt, m.timeZone)} at {timeLabel(b.startsAt, m.timeZone)} ({m.zoneLabel}), {b.durationMin} minutes</p>
        <p style={{ margin: 0, color: "#374151" }}>Status: {b.status === "booked" ? "booked" : b.status}</p>
      </section>
      {ok ? <div style={okBox} role="status">{ok}</div> : null}
      {err ? <div style={errorBox} role="alert">{err}</div> : null}
      {b.canChange && !slots && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={btn.primary} onClick={() => void showTimes()}>Pick a new time</button>
          <button type="button" style={btn.ghost} onClick={() => { if (window.confirm("Cancel this booking?")) void cancel(); }}>Cancel booking</button>
        </div>
      )}
      {slots && (
        <section style={cardStyle}>
          <SlotPicker slots={slots} tz={m.timeZone} value={startsAt} onChange={setStartsAt} />
          <button type="button" style={{ ...btn.primary, marginTop: 10 }} disabled={!startsAt} onClick={() => void move()}>Move my booking</button>
        </section>
      )}
    </main>
  );
}

export default WebsiteBookingRedirect;
