// BF_CLIENT_BLOCK_CMP_PWA_INSTALL_v1 — first-view mini-portal prompt to add the
// portal to the home screen (this is where Boreal communicates with the client),
// plus "Coming Soon" iOS/Android download placeholders that reveal the add-to-
// home-screen steps. Dismiss is permanent ("Don't show again").
import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";

type Platform = "ios" | "android" | "desktop" | "unknown";

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "boreal.install-prompt.dismissed";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navAny = window.navigator as Navigator & { standalone?: boolean };
  if (navAny.standalone === true) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return false;
}

const styles = {
  card: { background: "linear-gradient(135deg, #0B1F3A 0%, #1A3A5C 100%)", color: "#fff", borderRadius: 12, padding: 20, margin: "0 0 20px", boxShadow: "0 4px 12px rgba(11, 31, 58, 0.15)" } as CSSProperties,
  title: { fontSize: 18, fontWeight: 700, margin: "0 0 6px" } as CSSProperties,
  subtitle: { fontSize: 14, opacity: 0.9, margin: "0 0 14px", lineHeight: 1.5 } as CSSProperties,
  benefits: { fontSize: 13.5, opacity: 0.92, margin: "0 0 16px", lineHeight: 1.7, paddingLeft: 18 } as CSSProperties,
  buttonRow: { display: "flex", gap: 10, flexWrap: "wrap" as const } as CSSProperties,
  primaryBtn: { background: "#fff", color: "#0B1F3A", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as CSSProperties,
  secondaryBtn: { background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer" } as CSSProperties,
  steps: { background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 14, margin: "12px 0 0", fontSize: 13, lineHeight: 1.6 } as CSSProperties,
  comingSoon: { background: "rgba(255,255,255,0.16)", borderRadius: 8, padding: 14, margin: "12px 0 0", fontSize: 13, lineHeight: 1.6 } as CSSProperties,
};

type StepKey = "ios" | "android" | "desktop";

const STEPS: Record<StepKey, { label: string; steps: string[] }> = {
  ios: { label: "On iPhone or iPad (Safari)", steps: [
    "Tap the Share button at the bottom of Safari",
    'Scroll down and tap "Add to Home Screen"',
    'Tap "Add" in the top-right corner',
  ] },
  android: { label: "On Android (Chrome)", steps: [
    "Tap the menu (three dots) at the top-right of Chrome",
    'Tap "Add to Home screen" (or "Install app")',
    'Tap "Add" to confirm',
  ] },
  desktop: { label: "On your computer (Chrome or Edge)", steps: [
    "Click the install icon in the address bar, or open the menu (three dots)",
    'Choose "Install Boreal Financial"',
    'Click "Install"',
  ] },
};

export default function InstallAppPrompt() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [openSteps, setOpenSteps] = useState<StepKey | null>(null);
  const [comingSoon, setComingSoon] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    try { setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1"); } catch {}
  }, []);

  useEffect(() => {
    function onBeforeInstall(e: Event) { e.preventDefault(); setInstallEvent(e as BeforeInstallPromptEvent); }
    function onInstalled() { setInstalled(true); setInstallEvent(null); }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const dismiss = useCallback(() => { try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {} setDismissed(true); }, []);

  if (installed || dismissed) return null;

  const stepKey: StepKey = platform === "unknown" ? "desktop" : platform;

  const onAddToHome = async () => {
    setComingSoon(false);
    if (installEvent) {
      try { await installEvent.prompt(); await installEvent.userChoice; } finally { setInstallEvent(null); }
      return;
    }
    setOpenSteps((p) => (p && !comingSoon ? null : stepKey));
  };

  return (
    <div style={styles.card} role="region" aria-label="Add Boreal to your home screen">
      <div style={styles.title}>Add Boreal to your home screen</div>
      <div style={styles.subtitle}>This is where Boreal Financial keeps in touch with you throughout your application — add it to your home screen for one-tap access.</div>
      <ul style={styles.benefits}>
        <li>Call Boreal directly</li>
        <li>Message your intake team</li>
        <li>Upload missing documents</li>
        <li>Complete additional forms</li>
        <li>Review your offers</li>
      </ul>
      <div style={styles.buttonRow}>
        <button type="button" style={styles.primaryBtn} onClick={onAddToHome}>Add to Home Screen</button>
        <button type="button" style={styles.secondaryBtn} onClick={() => { setComingSoon(true); setOpenSteps("ios"); }}>Download for iOS</button>
        <button type="button" style={styles.secondaryBtn} onClick={() => { setComingSoon(true); setOpenSteps("android"); }}>Download for Android</button>
        <button type="button" style={styles.secondaryBtn} onClick={dismiss}>Don&rsquo;t show again</button>
      </div>
      {comingSoon && (
        <div style={styles.comingSoon}>
          <strong>Coming Soon!</strong> The iOS and Android apps aren&rsquo;t published yet. For now, please add this portal to your home screen using the steps below.
        </div>
      )}
      {openSteps && (
        <div style={styles.steps}>
          <strong>{STEPS[openSteps].label}</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {STEPS[openSteps].steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
