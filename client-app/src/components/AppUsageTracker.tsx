// BF_CLIENT_v811_APP_USAGE - counts an "open" when the app starts and each time it comes back to the foreground
// (at most once per 30 minutes). See src/lib/appUsage.ts.
import { useEffect } from "react";
import { trackOpen } from "@/lib/appUsage";

export default function AppUsageTracker(): null {
  useEffect(() => {
    trackOpen();
    let remove: (() => void) | null = null;
    let alive = true;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("appStateChange", ({ isActive }) => { if (isActive) trackOpen(); });
        if (alive) remove = () => { void h.remove(); }; else void h.remove();
      } catch { /* web: the page load is the open */ }
    })();
    return () => { alive = false; remove?.(); };
  }, []);
  return null;
}
