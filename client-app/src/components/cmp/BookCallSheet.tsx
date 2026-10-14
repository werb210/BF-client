// BF_CLIENT_v802_BOOK_IN_APP - book a 30-minute phone or Teams call without leaving the app. "Book a call"
// used to open boreal.financial/book in the browser. Same booking API the website uses (BF-Server /api/booking):
// the advisor's own times when they take bookings, otherwise the team's.
import { useEffect, useMemo, useState } from "react";
import { apiCall } from "@/api/client";
import { Sheet } from "./CmpHome";
import "./cmp.css";

type Slot = { startsAt: string; staffIds: string[] };
type Booked = { startsAt: string; staffFirstName?: string | null; kind: "phone" | "teams"; joinUrl?: string | null };

export type BookPrefill = { name: string; email: string; phone: string };

function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export default function BookCallSheet({ advisorId, advisorFirstName, prefill, onClose }: { advisorId: string | null; advisorFirstName: string | null; prefill: BookPrefill; onClose: () => void }) {
  const [kind, setKind] = useState<"phone" | "teams">("phone");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [tz, setTz] = useState("America/Edmonton");
  const [forStaff, setForStaff] = useState<string>("any");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [day, setDay] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [name, setName] = useState(prefill.name);
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const read = async (staff: string) => apiCall<{ timeZone?: string; slots?: Slot[] }>(`/api/booking/slots?staff=${encodeURIComponent(staff)}`);
      try {
        let r = advisorId ? await read(advisorId) : null;
        let staff = advisorId ?? "any";
        if (!r || !Array.isArray(r.slots) || r.slots.length === 0) { r = await read("any"); staff = "any"; }
        if (!alive) return;
        setTz(typeof r?.timeZone === "string" && r.timeZone ? r.timeZone : "America/Edmonton");
        setForStaff(staff);
        setSlots(Array.isArray(r?.slots) ? r!.slots : []);
      } catch (e) {
        void e;
        if (alive) setLoadErr("Booking is unavailable right now. Please call (866) 631-8939, or message your advisor.");
      }
    })();
    return () => { alive = false; };
  }, [advisorId]);

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) { const k = dayKey(s.startsAt, tz); map.set(k, [...(map.get(k) ?? []), s]); }
    return [...map.entries()].map(([k, list]) => ({ key: k, first: list[0]!.startsAt, list }));
  }, [slots, tz]);
  useEffect(() => { if (!day && days.length) setDay(days[0]!.key); }, [days, day]);
  const times = days.find((d) => d.key === day)?.list ?? [];
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...opts }).format(new Date(iso));
  // BF_CLIENT_v805_PHONE_FIXES - times split into Morning and Afternoon so the list is easy to scan.
  const hourIn = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  const timeGroups = [
    { label: "Morning", list: times.filter((s) => hourIn(s.startsAt) < 12) },
    { label: "Afternoon", list: times.filter((s) => hourIn(s.startsAt) >= 12) },
  ].filter((g) => g.list.length > 0);
  const who = forStaff !== "any" && advisorFirstName ? advisorFirstName : "an advisor";

  const submit = async () => {
    setErr(null);
    if (!startsAt) { setErr("Pick a time."); return; }
    if (!name.trim() || !/^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(email.trim())) { setErr("Add your name and email so we can send the invitation."); return; }
    if (kind === "phone" && phone.replace(/\D/g, "").length < 10) { setErr("Add the number we should call."); return; }
    setBusy(true);
    try {
      const r = await apiCall<{ ok?: boolean; booking?: Booked }>("/api/booking", { method: "POST", body: { kind, name: name.trim(), email: email.trim(), phone: phone.trim(), startsAt, staffId: forStaff, notes: notes.trim() } });
      setBooked(r?.booking ?? { startsAt, kind });
    } catch (e) {
      const status = Number((e as { status?: unknown })?.status ?? 0);
      setErr(status === 409 ? "That time was just taken. Please pick another."
        : status === 400 ? "Please check your name, email and number, then try again."
        : status === 429 ? "Too many tries. Please wait a few minutes, or call (866) 631-8939."
        : "We couldn't book that right now. Please try again or call (866) 631-8939.");
      if (status === 409) setStartsAt("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Book a call" onClose={onClose} testId="cmp-book-sheet" panelClassName={booked ? undefined : "cmpx-sheet__panel--cta"}>
      {booked ? (
        <div data-testid="cmp-book-done">
          <p style={{ fontSize: 17, fontWeight: 700, color: "#0B1F3A", margin: "4px 0 6px" }}>You're booked.</p>
          <p className="cmpx-muted" style={{ margin: "0 0 16px" }}>
            {fmt(booked.startsAt, { weekday: "long", month: "long", day: "numeric" })} at {fmt(booked.startsAt, { hour: "numeric", minute: "2-digit" })}
            {booked.staffFirstName ? " with " + booked.staffFirstName : ""}. {booked.kind === "teams" ? "The Teams link is in the invitation we emailed you." : "We'll call you at the number you gave."}
          </p>
          <button type="button" className="cmpx-btn cmpx-btn--block" onClick={onClose}>Done</button>
        </div>
      ) : (
        <>
          <p className="cmpx-muted" style={{ margin: "0 0 8px" }}>A 30-minute call with {who}. Times are Alberta time.</p>
          <div className="cmpx-seg" role="group" aria-label="Call type">
            <button type="button" aria-pressed={kind === "phone"} onClick={() => setKind("phone")}>Phone call</button>
            <button type="button" aria-pressed={kind === "teams"} onClick={() => setKind("teams")}>Teams video</button>
          </div>
          {loadErr ? <p className="cmpx-err">{loadErr}</p> : slots === null ? <p className="cmpx-muted">Loading times...</p> : days.length === 0 ? (
            <p className="cmpx-muted">No times are open in the next two weeks. Message your advisor and they'll find a time with you.</p>
          ) : (
            <>
              <div className="cmpx-days" role="group" aria-label="Day">
                {days.map((d) => (
                  <button key={d.key} type="button" className="cmpx-day" aria-pressed={d.key === day} onClick={() => { setDay(d.key); setStartsAt(""); }}>
                    <small>{fmt(d.first, { weekday: "short" })}</small>
                    <strong>{fmt(d.first, { day: "numeric" })}</strong>
                    <small>{fmt(d.first, { month: "short" })}</small>
                  </button>
                ))}
              </div>
              {timeGroups.map((g) => (
                <div key={g.label} data-testid={"cmp-book-group-" + g.label.toLowerCase()}>
                  <p className="cmpx-timegroup">{g.label}</p>
                  <div className="cmpx-times" role="group" aria-label={g.label + " times"}>
                    {g.list.map((s) => (
                      <button key={s.startsAt} type="button" className="cmpx-time" aria-pressed={s.startsAt === startsAt} onClick={() => setStartsAt(s.startsAt)}>
                        {fmt(s.startsAt, { hour: "numeric", minute: "2-digit" })}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <label className="cmpx-field">Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
              <label className="cmpx-field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
              {kind === "phone" ? <label className="cmpx-field">Number to call<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label> : null}
              <label className="cmpx-field">Anything we should know? (optional)<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
              <div className="cmpx-book-cta">
                {err ? <p className="cmpx-err" role="alert">{err}</p> : null}
                <button type="button" className="cmpx-btn cmpx-btn--block" disabled={busy || !startsAt} onClick={() => void submit()} data-testid="cmp-book-confirm">
                  {busy ? "Booking..." : startsAt ? "Book " + fmt(startsAt, { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Pick a time"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
