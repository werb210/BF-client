// BF_CLIENT_FEATURE_TOUR_v720 - one-time tour of the app's phone features, shown the first time a
// person reaches the client mini-portal in the installed app (never on the website). Each step
// can be skipped; notifications and Face ID are switched on right from the step.
// "Seen" is kept on the device, so it shows once per install.
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { biometryStatus, enrollDeviceWithReason, isEnrolled } from "@/native/deviceSignIn";
import { trackEvent } from "@/utils/analytics";
export const TOUR_KEY = "boreal_bf_feature_tour_v1";
export type TourStep = { id: string; title: string; body: string; action?: "push" | "faceid" };

export function tourSteps(platform: string, opts: { faceId: boolean }): TourStep[] {
  const ios = platform === "ios";
  const steps: TourStep[] = [
    { id: "welcome", title: "Welcome to Boreal Financial", body: "A quick look at what the app can do. It takes about a minute, and you can skip any step." },
    { id: "push", title: "Know the moment something changes", body: "We'll let you know when we need a document, when a lender responds, and when your file moves forward.", action: "push" },
  ];
  if (opts.faceId) steps.push({ id: "faceid", title: ios ? "Sign in with Face ID" : "Sign in with your fingerprint or face", body: "Skip the text code next time and open your file with a glance.", action: "faceid" });
  steps.push(
    { id: "scan", title: "Scan documents with your camera", body: "When we ask for a document, choose Scan to photograph it with your camera instead of hunting for a file." },
    { id: "share", title: "Send files from other apps", body: ios ? "In Photos, Files or Mail, tap Share and choose Boreal Financial to send a document straight to your file." : "In Photos, Files or Gmail, tap Share and choose Boreal Financial to send a document straight to your file." },
    { id: "widget", title: "Keep your progress on your home screen", body: ios ? "Touch and hold an empty spot on your home screen, tap Edit, then Add Widget, and choose Boreal Financial." : "Touch and hold an empty spot on your home screen, tap Widgets, and drag Boreal Financial onto your screen." },
    { id: "call", title: "Call us from the app", body: "Tap Call us on your file to talk to your advisor right from the app, over Wi-Fi or data." },
  );
  return steps;
}

function seen(): boolean { try { return localStorage.getItem(TOUR_KEY) === "done"; } catch { return true; } }
function markSeen() { try { localStorage.setItem(TOUR_KEY, "done"); } catch { /* storage unavailable */ } }

export default function FeatureTour({ forceOpen = false }: { forceOpen?: boolean }) {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!forceOpen && (!Capacitor.isNativePlatform() || seen())) return;
    let off = false;
    (async () => {
      const bio = await biometryStatus().catch(() => ({ native: false, available: false }));
      const already = bio.available ? await isEnrolled().catch(() => false) : false;
      if (!off) setSteps(tourSteps(Capacitor.getPlatform(), { faceId: Boolean(bio.available) && !already }));
    })();
    return () => { off = true; };
  }, [forceOpen]);

  if (!steps) return null;
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const finish = (how: "done" | "skipped") => { markSeen(); trackEvent("feature_tour_" + how, { step: step.id }); setSteps(null); };
  const next = () => { setNote(null); if (last) finish("done"); else setI(i + 1); };

  const act = async () => {
    setBusy(true); setNote(null);
    try {
      if (step.action === "push") {
        let p = await PushNotifications.checkPermissions();
        if (p.receive === "prompt" || p.receive === "prompt-with-rationale") p = await PushNotifications.requestPermissions();
        if (p.receive === "granted") { await PushNotifications.register(); setNote("Notifications are on."); trackEvent("feature_tour_push_on", {}); }
        else setNote("Notifications are off. You can turn them on any time in your phone's Settings under Boreal Financial.");
      } else if (step.action === "faceid") {
        const r = await enrollDeviceWithReason();
        if (r.ok) { setNote("Done - next time you can sign in with a glance."); trackEvent("feature_tour_faceid_on", {}); }
        else if (r.ok === false && r.message) setNote(r.message);
      }
    } catch { setNote("That didn't work this time - you can turn it on later from your account menu."); }
    finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="App tour" data-testid="feature-tour"
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(11,31,58,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", color: "#0f172a", borderRadius: 16, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>{i + 1} of {steps.length}</div>
        <h2 style={{ fontSize: 20, margin: "0 0 8px", fontWeight: 700 }}>{step.title}</h2>
        <p style={{ fontSize: 15, lineHeight: 1.45, margin: "0 0 14px", color: "#334155" }}>{step.body}</p>
        {note && <p role="status" style={{ fontSize: 14, margin: "0 0 12px", color: "#065f46" }}>{note}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={() => finish("skipped")} style={{ background: "none", border: "none", color: "#475569", fontSize: 15, padding: "10px 4px" }}>Skip tour</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step.action && !note && (
              <button type="button" disabled={busy} onClick={() => void act()} style={{ background: "#0B1F3A", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 15 }}>
                {busy ? "One moment..." : step.action === "push" ? "Turn on notifications" : "Turn on"}
              </button>
            )}
            <button type="button" onClick={next} style={{ background: step.action && !note ? "#e2e8f0" : "#0B1F3A", color: step.action && !note ? "#0f172a" : "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 15 }}>
              {last ? "Done" : step.action && !note ? "Not now" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
