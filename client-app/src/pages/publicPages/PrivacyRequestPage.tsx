// BF_CLIENT_v869_SETTINGS_PACK_PRIVACY - a client asks for a copy of their information, a correction, or deletion
// (no sign-in). BF-Server POST /api/privacy/requests/public records it for staff (Settings > Privacy requests), who
// answer within 30 days. Nothing is exported, changed or deleted by this page.
import { useState, type CSSProperties } from "react";
import { useBrand } from "./borealBrand";
import { publicApi, PublicApiError } from "./publicApi";

const NAVY = "#1E3A8A";
const page: CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "24px 16px 120px", color: "#111827", fontSize: 16, lineHeight: 1.5 };
const label: CSSProperties = { display: "block", fontSize: 15, fontWeight: 600, margin: "12px 0 4px", color: "#1F2937" };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 10, border: "1px solid #94A3B8", fontSize: 16, color: "#111827", background: "#ffffff" };

const KINDS = [
  { value: "access", text: "Send me a copy of the information you hold about me" },
  { value: "correction", text: "Correct information you hold about me" },
  { value: "deletion", text: "Delete my information" },
];

export default function PrivacyRequestPage() {
  const brand = useBrand();
  const [form, setForm] = useState({ name: "", email: "", phone: "", kind: "access", details: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await publicApi("/api/privacy/requests/public", { method: "POST", body: form });
      setDone(true);
    } catch (e) {
      const body = e instanceof PublicApiError ? e.body : null;
      const first = body?.errors ? Object.values(body.errors).find((x) => typeof x === "string") : null;
      setErr(String(first ?? (e instanceof PublicApiError && e.status === 429 ? "Too many requests from this device. Please try again later." : "We could not send your request. Please call (866) 631-8939.")));
    } finally { setBusy(false); }
  };

  return (
    <main style={page} data-testid="privacy-request-page">
      <div style={{ fontWeight: 700, color: NAVY, fontSize: 20 }}>{brand.company_name}</div>
      <h1 style={{ fontSize: 24, margin: "12px 0 4px", color: "#111827" }}>Your privacy request</h1>
      {done ? (
        <p role="status" style={{ padding: 12, borderRadius: 10, background: "#DCFCE7", color: "#14532D" }}>
          Thank you. We have your request and will answer within 30 days. We may contact you to confirm it is you.
        </p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <p style={{ color: "#374151" }}>Use the email address you gave us, so we can find your information.</p>
          <label htmlFor="pr-name" style={label}>Your name</label>
          <input id="pr-name" style={field} value={form.name} autoComplete="name" onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label htmlFor="pr-email" style={label}>Email</label>
          <input id="pr-email" type="email" style={field} value={form.email} autoComplete="email" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <label htmlFor="pr-phone" style={label}>Phone (optional)</label>
          <input id="pr-phone" type="tel" style={field} value={form.phone} autoComplete="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label htmlFor="pr-kind" style={label}>What would you like us to do?</label>
          <select id="pr-kind" style={field} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.text}</option>)}
          </select>
          <label htmlFor="pr-details" style={label}>Anything we should know (optional)</label>
          <textarea id="pr-details" rows={4} style={{ ...field, minHeight: 96 }} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          {/* Hidden from people; bots fill it in. */}
          <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} style={{ position: "absolute", left: -9999, width: 1, height: 1 }} />
          {err && <p role="alert" style={{ padding: 10, borderRadius: 10, background: "#FEE2E2", color: "#7F1D1D" }}>{err}</p>}
          <button type="submit" disabled={busy} style={{ marginTop: 16, minHeight: 48, padding: "0 18px", borderRadius: 12, border: 0, background: NAVY, color: "#ffffff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
            {busy ? "Sending..." : "Send request"}
          </button>
          <p style={{ fontSize: 15, color: "#374151", marginTop: 16 }}>Records about a loan file are kept for 7 years by law; if a deletion cannot be done yet, we will tell you what is kept and until when, and stop all marketing to you.</p>
        </form>
      )}
    </main>
  );
}
