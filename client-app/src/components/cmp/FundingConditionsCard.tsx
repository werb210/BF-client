// BF_CLIENT_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - the last items the lender needs before funding that the client must supply.
// Staff set them on the application's Funding tab; each one is sent here (a document, or "Done" for the rest).
// Hidden while there is nothing for the client to do.
import { useCallback, useEffect, useState } from "react";
import { apiCall } from "@/api/client";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";

export type ClientCondition = { id: string; title: string; description: string | null; due_date: string | null; status: string; requires_document: boolean; submitted: boolean };

export function conditionsHeading(list: ClientCondition[]): string {
  const left = list.filter((c) => !c.submitted).length;
  if (left === 0) return "Thanks - we have everything you sent. Your advisor will confirm with the lender.";
  return left === 1 ? "1 item left before your funding" : `${left} items left before your funding`;
}

export default function FundingConditionsCard({ applicationId }: { applicationId: string }) {
  const [list, setList] = useState<ClientCondition[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiCall<{ conditions?: ClientCondition[] }>(`/api/client-broker/conditions?applicationId=${encodeURIComponent(applicationId)}`);
      setList(Array.isArray(r?.conditions) ? r.conditions : []);
    } catch { setList([]); }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  const send = async (c: ClientCondition, file?: File) => {
    setBusy(c.id); setNote(null);
    try {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("applicationId", applicationId);
        const res = await fetch(`${ENV.API_BASE}/api/client-broker/conditions/${c.id}/upload`, { method: "POST", headers: { Authorization: "Bearer " + (getToken() ?? "") }, body: form });
        if (!res.ok) { const j = await res.json().catch(() => ({})) as { message?: string }; throw new Error(j.message ?? "Upload failed. Try again."); }
      } else {
        await apiCall(`/api/client-broker/conditions/${c.id}/done`, { method: "POST", body: { applicationId } });
      }
      setNote(`Sent: ${c.title}`);
      await load();
    } catch (e) {
      setNote(e instanceof Error && e.message ? e.message : "That did not go through. Try again.");
    } finally { setBusy(null); }
  };

  if (!list.length) return null;
  return (
    <section className="cmpx-card" data-cmp-tab="home" data-testid="cmp-funding-conditions">
      <div className="cmpx-eyebrow">Before your funding</div>
      <h2 style={{ margin: "4px 0 8px", fontSize: 18 }}>{conditionsHeading(list)}</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((c) => (
          <li key={c.id} style={{ borderTop: "1px solid rgba(127,127,127,0.25)", paddingTop: 10 }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            {c.description ? <div style={{ fontSize: 14, marginTop: 2 }}>{c.description}</div> : null}
            {c.due_date ? <div style={{ fontSize: 13, marginTop: 2 }}>Needed by {c.due_date}</div> : null}
            {c.submitted ? <div className="cmpx-note" role="status">Sent - your advisor is reviewing it.</div> : c.requires_document ? (
              <label className="cmpx-btn cmpx-btn--block" style={{ marginTop: 8, cursor: busy ? "default" : "pointer" }}>
                {busy === c.id ? "Sending..." : "Upload the document"}
                <input type="file" style={{ display: "none" }} disabled={Boolean(busy)} onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(c, f); }} />
              </label>
            ) : (
              <button type="button" className="cmpx-btn cmpx-btn--block" style={{ marginTop: 8 }} disabled={Boolean(busy)} onClick={() => void send(c)}>{busy === c.id ? "Sending..." : "Mark as done"}</button>
            )}
          </li>
        ))}
      </ul>
      {note ? <div className="cmpx-note" role="status">{note}</div> : null}
    </section>
  );
}
