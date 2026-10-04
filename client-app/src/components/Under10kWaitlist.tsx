// BF_CLIENT_UNDER_10K_WAITLIST_v722 - a Canadian business under $10k/month in revenue is not
// a fit for today's lenders. Instead of only turning them away, offer a 3-field list so
// Boreal can contact them when a lender for smaller businesses is available. Saved to the
// CRM tagged under_10k_revenue_waitlist; the checkbox records express consent to contact.
import { useState } from "react";
import { joinWaitlist } from "../services/mayaService";

export default function Under10kWaitlist({ initial }: { initial?: { name?: string; email?: string; phone?: string } }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const ready = name.trim().length > 1 && (email.trim().includes("@") || phone.replace(/[^0-9]/g, "").length >= 10) && consent;

  if (state === "done") return <p data-testid="under10k-done" style={{ fontWeight: 600 }}>Thanks - you are on the list. We will contact you when a lender for your stage is available.</p>;

  return (
    <div data-testid="under10k-waitlist" style={{ display: "grid", gap: 8, margin: "12px 0" }}>
      <strong>Want us to let you know when that changes?</strong>
      <input aria-label="Full name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <input aria-label="Email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input aria-label="Mobile phone" type="tel" placeholder="Mobile phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Yes, Boreal Financial may contact me by email, text or phone about financing for my business. I can opt out at any time.</span>
      </label>
      <button type="button" disabled={!ready || state === "saving"} onClick={async () => {
        setState("saving");
        try {
          const r: any = await joinWaitlist({ name: name.trim(), email: email.trim(), phone: phone.trim(), list: "under_10k", consent: true });
          setState(r && r.ok === false ? "error" : "done");
        } catch { setState("error"); }
      }}>{state === "saving" ? "Saving..." : "Add me to the list"}</button>
      {state === "error" && <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>That did not save. Please try again, or call us.</p>}
    </div>
  );
}
