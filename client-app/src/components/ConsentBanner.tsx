import { useEffect, useState, type ReactElement } from "react";

const KEY = "boreal_consent_v1";

function applyConsent(granted: boolean) {
  const w = window as unknown as { dataLayer: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push([
    "consent",
    "update",
    {
      ad_storage: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
    },
  ]);
}

export default function ConsentBanner(): ReactElement | null {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(KEY); } catch { stored = null; }
    if (stored === "granted") { applyConsent(true); return; }
    if (stored === "denied") { applyConsent(false); return; }
    setShow(true);
  }, []);

  if (!show) return null;

  const choose = (granted: boolean) => {
    try { localStorage.setItem(KEY, granted ? "granted" : "denied"); } catch { /* ignore */ }
    applyConsent(granted);
    setShow(false);
  };

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 80, background: "#0B1320", color: "#fff", borderTop: "1px solid rgba(255,255,255,0.12)", padding: "16px 20px calc(16px + env(safe-area-inset-bottom))", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center" }}>
      <p style={{ margin: 0, fontSize: 13, maxWidth: 640, lineHeight: 1.5 }}>
        We use cookies to analyze traffic and improve your experience. You can accept or decline analytics and advertising cookies.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => choose(false)} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Decline</button>
        <button onClick={() => choose(true)} style={{ background: "#1E3A8A", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Accept</button>
      </div>
    </div>
  );
}
