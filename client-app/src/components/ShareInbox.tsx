// BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL
import { useCallback, useEffect, useState } from "react";
import { apiCall } from "@/api/client";
import { getToken } from "@/auth/token";
import { enqueueUploadFromFile, processQueue } from "@/lib/uploadQueue";
import { SHARED_EVENT, takePendingShared } from "@/native/sharedFiles";
type App = { id: string; business_name?: string | null; product_category?: string | null };
type Item = { key: string; kind: string; label: string };
export type ShareDeps = {
  loadApps: () => Promise<App[]>;
  loadItems: (applicationId: string) => Promise<Item[]>;
  upload: (applicationId: string, documentType: string, files: File[]) => Promise<void>;
  signedIn: () => boolean;
};
const defaultDeps: ShareDeps = {
  loadApps: async () => {
    const r = await apiCall<any>("/api/client/applications/by-phone");
    return Array.isArray(r?.applications) ? r.applications : [];
  },
  loadItems: async (applicationId) => {
    const r = await apiCall<any>(`/api/client/documents-needed/action-center?applicationId=${encodeURIComponent(applicationId)}`);
    return Array.isArray(r?.outstanding) ? r.outstanding : [];
  },
  upload: async (applicationId, documentType, files) => {
    for (const file of files) await enqueueUploadFromFile({ applicationToken: "", applicationId, documentType, file, mode: "session" });
    await processQueue().catch((): void => undefined);
  },
  signedIn: () => Boolean(getToken()),
};
export const OTHER = "other";
export default function ShareInbox({ deps = defaultDeps }: { deps?: ShareDeps }) {
  const [files, setFiles] = useState<File[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [appId, setAppId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [docType, setDocType] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [signedIn, setSignedIn] = useState(deps.signedIn());
  useEffect(() => {
    const grab = () => { const got = takePendingShared(); if (got.length) { setFiles((prev) => [...prev, ...got]); setState("idle"); } };
    grab();
    window.addEventListener(SHARED_EVENT, grab);
    return () => window.removeEventListener(SHARED_EVENT, grab);
  }, []);
  useEffect(() => {
    if (!files.length || !signedIn) return;
    deps.loadApps().then((list) => { setApps(list); if (list[0]) setAppId((cur) => cur || String(list[0].id)); }).catch((): void => undefined);
  }, [files.length, signedIn, deps]);
  useEffect(() => {
    if (!appId) return;
    deps.loadItems(appId)
      .then((list) => { const docs = list.filter((i) => i.kind === "document"); setItems(docs); setDocType(docs[0] ? docs[0].key.replace(/^upload:/, "") : OTHER); })
      .catch((): void => { setItems([]); setDocType(OTHER); });
  }, [appId, deps]);
  const close = useCallback(() => { setFiles([]); setState("idle"); }, []);
  const send = async () => {
    if (!appId || !docType) return;
    setState("sending");
    try {
      await deps.upload(appId, docType, files);
      setState("sent");
      setTimeout(close, 1500);
    } catch {
      setState("error");
    }
  };
  if (!files.length) return null;
  const names = files.map((f) => f.name).join(", ");
  const box: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 };
  const sel: React.CSSProperties = { display: "block", width: "100%", marginTop: 4 };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, width: "100%", maxWidth: 420, color: "#0f172a" };
  return (
    <div style={box} role="dialog" aria-modal="true" data-testid="share-inbox">
      <div style={card}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Add to your application</div>
        <div style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>{names}</div>
        {!signedIn ? (
          <>
            <p style={{ fontSize: 14 }}>Sign in first, then tap Continue.</p>
            <button type="button" onClick={() => setSignedIn(deps.signedIn())}>Continue</button>
          </>
        ) : state === "sent" ? (
          <p style={{ fontSize: 15, fontWeight: 600, color: "#15803d" }}>Sent. We'll let you know if anything else is needed.</p>
        ) : (
          <>
            {apps.length > 1 ? (
              <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>Application
                <select value={appId} onChange={(e) => setAppId(e.target.value)} style={sel}>
                  {apps.map((a) => <option key={a.id} value={a.id}>{[a.business_name, a.product_category].filter(Boolean).join(" \u00b7 ") || a.id.slice(-8)}</option>)}
                </select>
              </label>
            ) : null}
            <label style={{ display: "block", fontSize: 13, marginBottom: 14 }}>What is this?
              <select aria-label="What is this?" value={docType} onChange={(e) => setDocType(e.target.value)} style={sel}>
                {items.map((i) => <option key={i.key} value={i.key.replace(/^upload:/, "")}>{i.label}</option>)}
                <option value={OTHER}>Something else</option>
              </select>
            </label>
            {state === "error" ? <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>That didn't send. Please try again.</p> : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={close}>Cancel</button>
              <button type="button" disabled={state === "sending" || !appId} onClick={() => void send()} style={{ fontWeight: 700 }}>
                {state === "sending" ? "Sending\u2026" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
