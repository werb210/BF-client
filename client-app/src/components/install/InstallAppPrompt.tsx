// BF_CLIENT_BLOCK_1_37_POST_SUBMIT_INSTALL_PROMPT
import { useEffect, useState, useCallback } from "react";

// Configurable store URLs. Replace these with real listings when the
// apps are published. Until then, the buttons remain hidden.
const IOS_APP_STORE_URL = ""; // e.g. "https://apps.apple.com/app/idXXXXXXXXX"
const ANDROID_PLAY_URL  = ""; // e.g. "https://play.google.com/store/apps/details?id=ca.boreal.client"

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
  const navAny = window.navigator as any;
  if (navAny.standalone === true) return true;
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

const styles = {
  card: {
    background: "linear-gradient(135deg, #0B1F3A 0%, #1A3A5C 100%)",
    color: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: "0 0 20px",
    boxShadow: "0 4px 12px rgba(11, 31, 58, 0.15)",
  } as React.CSSProperties,
  title: { fontSize: 18, fontWeight: 700, margin: "0 0 6px" } as React.CSSProperties,
  subtitle: { fontSize: 14, opacity: 0.9, margin: "0 0 14px", lineHeight: 1.5 } as React.CSSProperties,
  benefits: { fontSize: 13, opacity: 0.85, margin: "0 0 16px", lineHeight: 1.6, paddingLeft: 18 } as React.CSSProperties,
  buttonRow: { display: "flex", gap: 10, flexWrap: "wrap" as const } as React.CSSProperties,
  primaryBtn: {
    background: "#fff", color: "#0B1F3A", border: 0, borderRadius: 8,
    padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  } as React.CSSProperties,
  secondaryBtn: {
    background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer",
  } as React.CSSProperties,
  iosSteps: {
    background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 14,
    margin: "12px 0 0", fontSize: 13, lineHeight: 1.6,
  } as React.CSSProperties,
};

export default function InstallAppPrompt() { /* ... */
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => { setPlatform(detectPlatform()); setInstalled(isStandalone()); try { setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1"); } catch {} }, []);
  useEffect(() => { function onBeforeInstall(e: Event) { e.preventDefault(); setInstallEvent(e as BeforeInstallPromptEvent); } function onInstalled() { setInstalled(true); setInstallEvent(null); } window.addEventListener("beforeinstallprompt", onBeforeInstall); window.addEventListener("appinstalled", onInstalled); return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstall); window.removeEventListener("appinstalled", onInstalled); }; }, []);
  const dismiss = useCallback(() => { try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {} setDismissed(true); }, []);
  const triggerInstall = useCallback(async () => { if (!installEvent) return; try { await installEvent.prompt(); await installEvent.userChoice; } finally { setInstallEvent(null); } }, [installEvent]);

  if (installed || dismissed || platform === "unknown") return null;
  const benefits = (<ul style={styles.benefits}><li>Track your application status anywhere — no need to log back in</li><li>Get push notifications the moment a lender responds</li><li>Upload documents straight from your camera</li><li>Talk to your Boreal advisor with one tap</li></ul>);
  if (platform === "ios") return <div style={styles.card} role="region" aria-label="Install Boreal app"><div style={styles.title}>Get Boreal on your home screen</div><div style={styles.subtitle}>Faster access, push notifications, and works offline. Free, no download required.</div>{benefits}<div style={styles.buttonRow}><button type="button" style={styles.primaryBtn} onClick={() => setShowIosSteps(v => !v)}>Add to home screen</button><button type="button" style={styles.secondaryBtn} onClick={dismiss}>Not now</button></div>{showIosSteps && <div style={styles.iosSteps}><strong>To install:</strong><ol style={{ margin: "8px 0 0", paddingLeft: 20 }}><li>Tap the Share button at the bottom of Safari</li><li>Scroll and tap <strong>Add to Home Screen</strong></li><li>Tap <strong>Add</strong> in the top-right corner</li></ol></div>}</div>;
  if (platform === "android") return <div style={styles.card} role="region" aria-label="Install Boreal app"><div style={styles.title}>Get the Boreal app</div><div style={styles.subtitle}>Track your application from your home screen. Free, takes 5 seconds.</div>{benefits}<div style={styles.buttonRow}>{ANDROID_PLAY_URL && <a href={ANDROID_PLAY_URL} target="_blank" rel="noreferrer" style={{ ...styles.primaryBtn, display: "inline-block", textDecoration: "none" }}>Get the Android app</a>}{installEvent && <button type="button" style={ANDROID_PLAY_URL ? styles.secondaryBtn : styles.primaryBtn} onClick={triggerInstall}>{ANDROID_PLAY_URL ? "Or install web version" : "Install"}</button>}<button type="button" style={styles.secondaryBtn} onClick={dismiss}>Not now</button></div></div>;
  if (installEvent) return <div style={styles.card} role="region" aria-label="Install Boreal app"><div style={styles.title}>Install Boreal as an app</div><div style={styles.subtitle}>Quick access from your dock. Same site, faster open.</div><div style={styles.buttonRow}><button type="button" style={styles.primaryBtn} onClick={triggerInstall}>Install</button><button type="button" style={styles.secondaryBtn} onClick={dismiss}>Not now</button></div></div>;
  return null;
}
