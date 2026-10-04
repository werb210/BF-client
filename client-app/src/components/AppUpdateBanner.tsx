// BF_CLIENT_APP_UPDATE_v723
// A phone app is a frozen copy of the client portal: it only changes when a new build is installed. An old
// build shows buttons whose screens it doesn't have (the fee agreement "Review" did nothing on a Sept build).
// The server says the oldest build that still works; an older app tells the client to update, and offers the
// always-current web version so they can finish right now.
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ENV } from "@/env";

const BUILT_AT: string | undefined = import.meta.env.VITE_APP_BUILT_AT;
const API = ENV.API_BASE || "https://server.boreal.financial";

export function isOutdated(builtAt: string | undefined, minBuild: string | undefined): boolean {
  if (!builtAt || !minBuild) return false;
  const b = Date.parse(builtAt), m = Date.parse(minBuild);
  return Number.isFinite(b) && Number.isFinite(m) && b < m;
}

export default function AppUpdateBanner() {
  const [webUrl, setWebUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let alive = true;
    fetch(API + "/api/client/app-version", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && isOutdated(BUILT_AT, d.minBuild)) setWebUrl(String(d.webUrl || "https://client.boreal.financial")); })
      .catch(() => { /* offline: keep the app usable, no banner */ });
    return () => { alive = false; };
  }, []);
  if (!webUrl) return null;
  return (
    <div role="alert" data-testid="app-update-banner" style={{ background: "#0B1F3A", color: "#ffffff", padding: "12px 16px", borderRadius: 10, margin: "12px 0", fontSize: 15 }}>
      <strong>This version of the Boreal app is out of date.</strong> Some buttons may not work. Update the app, or finish now in your browser.
      <div style={{ marginTop: 8 }}>
        <a href={webUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#ffffff", color: "#0B1F3A", padding: "8px 14px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Open in browser</a>
      </div>
    </div>
  );
}
