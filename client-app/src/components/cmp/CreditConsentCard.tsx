// BF_CLIENT_v867_BROKER_TOOLS_CREDIT_BUREAU - consent to a credit check, when the advisor asks for it: the exact wording, the
// person's full name typed and their date of birth (the bureau needs it to find the file). Hidden when nothing is asked.
import { useCallback, useEffect, useState } from "react";
import { apiCall } from "@/api/client";

export type ClientConsent = { id: string; status: "requested" | "given"; person: string; consent_text: string; given_at: string | null; needs_date_of_birth: boolean };

export default function CreditConsentCard({ applicationId }: { applicationId: string }) {
  const [list, setList] = useState<ClientConsent[]>([]);
  const [form, setForm] = useState<Record<string, { name: string; dob: string; agree: boolean }>>({});
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await apiCall<{ consents?: ClientConsent[] }>(`/api/client-credit/consents?applicationId=${encodeURIComponent(applicationId)}`);
      setList(Array.isArray(r?.consents) ? r.consents : []);
    } catch { setList([]); }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  const open = list.filter((c) => c.status === "requested");
  if (!open.length) return null;
  const give = async (c: ClientConsent) => {
    const f = form[c.id] ?? { name: "", dob: "", agree: false };
    setBusy(true); setNote(null);
    try {
      await apiCall(`/api/client-credit/consents/${c.id}`, { method: "POST", body: { applicationId, full_name: f.name, date_of_birth: f.dob || undefined, agree: f.agree } });
      setNote("Thank you. Your consent is recorded.");
      await load();
    } catch (e) {
      setNote(e instanceof Error && e.message ? e.message : "That did not go through. Try again.");
    } finally { setBusy(false); }
  };
  const set = (id: string, patch: Partial<{ name: string; dob: string; agree: boolean }>) => setForm((x) => ({ ...x, [id]: { name: "", dob: "", agree: false, ...x[id], ...patch } }));

  return (
    <section className="cmpx-card" data-cmp-tab="home" data-testid="cmp-credit-consent">
      <div className="cmpx-eyebrow">Credit check</div>
      <h2 style={{ margin: "4px 0 8px", fontSize: 18 }}>Your advisor needs your consent to check credit</h2>
      {open.map((c) => (
        <div key={c.id} style={{ borderTop: "1px solid rgba(127,127,127,0.25)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>For {c.person}</div>
          <p style={{ fontSize: 14, margin: 0 }}>{c.consent_text}</p>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>Type your full name
            <input aria-label={`Full name for ${c.person}`} value={form[c.id]?.name ?? ""} onChange={(e) => set(c.id, { name: e.target.value })} style={{ minHeight: 40, padding: "0 10px" }} />
          </label>
          {c.needs_date_of_birth ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>Date of birth
              <input type="date" aria-label={`Date of birth for ${c.person}`} value={form[c.id]?.dob ?? ""} onChange={(e) => set(c.id, { dob: e.target.value })} style={{ minHeight: 40, padding: "0 10px" }} />
            </label>
          ) : null}
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
            <input type="checkbox" checked={form[c.id]?.agree ?? false} onChange={(e) => set(c.id, { agree: e.target.checked })} />
            I agree to the credit check described above.
          </label>
          <button type="button" className="cmpx-btn cmpx-btn--block" disabled={busy} onClick={() => void give(c)}>{busy ? "Sending..." : "Give consent"}</button>
        </div>
      ))}
      {note ? <div className="cmpx-note" role="status">{note}</div> : null}
    </section>
  );
}
