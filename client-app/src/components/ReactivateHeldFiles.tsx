// BF_CLIENT_BLOCK_v548_REACTIVATE_HELD
// Every one of the client's files that staff put on Hold gets a banner with a
// "Reactivate this file" button. BF-Server v547 moves it back to In Review.
import { useState } from "react";
import { apiCall } from "@/api/client";

type HeldApp = { id: string; pipeline_state?: string | null; business_name?: string | null; product_category?: string | null; requested_amount?: number | string | null };

type Props = {
  apps: HeldApp[];
  onReactivated: (applicationId: string) => void;
  reactivate?: (applicationId: string) => Promise<unknown>;
};

const defaultReactivate = (id: string) =>
  apiCall(`/api/client/applications/${encodeURIComponent(id)}/reactivate`, { method: "POST" });

function describe(a: HeldApp): string {
  const name = String(a.business_name ?? "").trim();
  const cat = String(a.product_category ?? "").trim();
  const amt = Number(a.requested_amount ?? 0);
  const parts = [name, cat, Number.isFinite(amt) && amt > 0 ? `$${amt.toLocaleString()}` : ""].filter(Boolean);
  return parts.length ? parts.join(" \u00b7 ") : "Your previous application";
}

export default function ReactivateHeldFiles({ apps, onReactivated, reactivate = defaultReactivate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const held = apps.filter((a) => String(a?.pipeline_state ?? "").trim().toLowerCase() === "hold");
  if (!held.length) return null;

  const go = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await reactivate(id);
      onReactivated(id);
    } catch {
      setError("We couldn't reactivate that file. Please try again or message us.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {held.map((a) => (
        <div
          key={`held-${a.id}`}
          data-testid="cmp-reactivate-held"
          style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 8, padding: "12px 16px", margin: "0 0 12px", color: "#1e3a8a" }}
        >
          <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
            <div style={{ fontWeight: 700 }}>{describe(a)} is on hold.</div>
            <div>Ready to go again? Reactivate it and our team will review it.</div>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void go(String(a.id))}
            style={{ padding: "8px 16px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1d4ed8", border: "none", borderRadius: 6, cursor: busy ? "default" : "pointer", opacity: busy && busy !== a.id ? 0.6 : 1 }}
          >
            {busy === a.id ? "Reactivating\u2026" : "Reactivate this file"}
          </button>
        </div>
      ))}
      {error ? <div role="alert" style={{ color: "#b91c1c", fontSize: 13, margin: "0 0 12px" }}>{error}</div> : null}
    </>
  );
}
