// BF_CLIENT_v802_SETTINGS - the phone Settings tab (item 23): sign-in and security, notifications, your
// details, your file, help and legal, Sign out, the app version, and Delete account last, in plain text.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FaceIdSignInToggle from "@/components/FaceIdSignInToggle";
import PasskeySignInToggle from "@/components/PasskeySignInToggle";
import { wipeSession } from "@/auth/logout";
import { CmpMoreFooter } from "@/components/CmpPhone";
import { Icon } from "./icons";
import "./cmp.css";

type PushState = "checking" | "on" | "off" | "blocked" | "web";

/** Item 24 - whether this phone gets notifications, and a way to turn them on. */
export function usePushStatus(): { state: PushState; turnOn: () => Promise<void>; note: string | null } {
  const [state, setState] = useState<PushState>("checking");
  const [note, setNote] = useState<string | null>(null);
  const check = useCallback(async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) { setState("web"); return; }
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const p = await PushNotifications.checkPermissions();
      setState(p.receive === "granted" ? "on" : p.receive === "denied" ? "blocked" : "off");
    } catch {
      setState("web");
    }
  }, []);
  useEffect(() => { void check(); }, [check]);
  const turnOn = useCallback(async () => {
    setNote(null);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const { PushNotifications } = await import("@capacitor/push-notifications");
      let p = await PushNotifications.checkPermissions();
      if (p.receive === "denied") {
        if (Capacitor.getPlatform() === "ios") {
          try { const { AppLauncher } = await import("@capacitor/app-launcher"); await AppLauncher.openUrl({ url: "app-settings:" }); return; } catch { /* fall through to the note */ }
        }
        setNote("Notifications are off for Boreal in your phone's Settings. Open Settings, find Boreal Financial, and turn on Notifications.");
        return;
      }
      if (p.receive !== "granted") p = await PushNotifications.requestPermissions();
      if (p.receive === "granted") { await PushNotifications.register(); setNote("Notifications are on."); }
      await check();
    } catch {
      setNote("We couldn't turn on notifications on this device.");
    }
  }, [check]);
  return { state, turnOn, note };
}

function Line({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="cmpx-row cmpx-row--static">
      <span className="cmpx-row__icon"><Icon name={icon} /></span>
      <span className="cmpx-row__text"><span className="cmpx-row__title">{title}</span></span>
      <span className="cmpx-row__value">{value || "\u2014"}</span>
    </div>
  );
}

function Action({ icon, title, desc, onClick, href, testId }: { icon: string; title: string; desc?: string; onClick?: () => void; href?: string; testId?: string }) {
  const body = (
    <>
      <span className="cmpx-row__icon"><Icon name={icon} /></span>
      <span className="cmpx-row__text"><span className="cmpx-row__title">{title}</span>{desc ? <span className="cmpx-row__desc">{desc}</span> : null}</span>
      <span className="cmpx-chev"><Icon name="chevron" size={18} /></span>
    </>
  );
  return href
    ? <a className="cmpx-row" href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }} data-testid={testId}>{body}</a>
    : <button type="button" className="cmpx-row" onClick={onClick} data-testid={testId}>{body}</button>;
}

export default function CmpSettings(p: {
  details: { name: string; phone: string; email: string; business: string };
  applicationNumber: string;
  stage: string;
  onDocuments: () => void;
  onAskQuestion: () => void;
  onReportProblem: () => void;
  onDeleteAccount: () => void;
}) {
  const navigate = useNavigate();
  const push = usePushStatus();
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try { await wipeSession(); } catch { /* storage is cleared before anything awaits */ }
    navigate("/otp", { replace: true });
  };
  return (
    <section className="cmp-phone-only cmpx-settings" data-cmp-tab="settings" data-testid="cmp-settings">
      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Sign-in and security</h2>
        <div className="cmpx-list cmpx-settings__toggles" data-testid="cmp-settings-security">
          <FaceIdSignInToggle />
          <PasskeySignInToggle />
          <div className="cmpx-row cmpx-row--static">
            <span className="cmpx-row__icon"><Icon name="lock" /></span>
            <span className="cmpx-row__text"><span className="cmpx-row__title">Text-message code</span><span className="cmpx-row__desc">You can always sign in with a code sent to your mobile.</span></span>
          </div>
        </div>
      </div>

      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Notifications</h2>
        <div className="cmpx-list" data-testid="cmp-settings-push">
          <div className="cmpx-row cmpx-row--static">
            <span className="cmpx-row__icon"><Icon name="bell" /></span>
            <span className="cmpx-row__text">
              <span className="cmpx-row__title">{push.state === "on" ? "Notifications are on" : push.state === "web" ? "Notifications" : push.state === "checking" ? "Checking..." : "Notifications are off"}</span>
              <span className="cmpx-row__desc">{push.state === "web" ? "Get the Boreal app to be told about offers, document requests and messages." : "Offers, document requests and messages from your advisor."}</span>
            </span>
            {push.state === "off" || push.state === "blocked" ? <button type="button" className="cmpx-btn" style={{ minHeight: 40, fontSize: 14 }} onClick={() => void push.turnOn()}>Turn on</button> : null}
          </div>
        </div>
        {push.note ? <p className="cmpx-muted" role="status" style={{ margin: "8px 4px 0" }}>{push.note}</p> : null}
      </div>

      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Your details</h2>
        <div className="cmpx-list" data-testid="cmp-settings-details">
          <Line icon="user" title="Name" value={p.details.name} />
          <Line icon="phone" title="Mobile" value={p.details.phone} />
          <Line icon="chat" title="Email" value={p.details.email} />
          <Line icon="folder" title="Business" value={p.details.business} />
        </div>
        <p className="cmpx-muted" style={{ margin: "8px 4px 0" }}>To change any of these, message your advisor.</p>
      </div>

      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Your file</h2>
        <div className="cmpx-list" data-testid="cmp-settings-file">
          <Line icon="doc" title="Application number" value={p.applicationNumber} />
          <Line icon="flag" title="Stage" value={p.stage} />
          <Action icon="upload" title="Documents" desc="Upload or re-upload what we've asked for." onClick={p.onDocuments} testId="cmp-settings-documents" />
        </div>
      </div>

      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Help</h2>
        <div className="cmpx-list">
          <Action icon="help" title="Ask a question" desc="Maya answers first; your advisor is one tap away." onClick={p.onAskQuestion} testId="cmp-settings-ask" />
          <Action icon="flag" title="Report a problem" desc="Tell us what went wrong. A screenshot is attached." onClick={p.onReportProblem} testId="cmp-settings-report" />
          <Action icon="shield" title="Privacy policy" href="https://www.boreal.financial/privacy" />
          <Action icon="doc" title="Terms of service" href="https://www.boreal.financial/terms" />
        </div>
      </div>

      <button type="button" className="cmpx-btn cmpx-btn--ghost cmpx-btn--block cmpx-signout" disabled={signingOut} onClick={() => void signOut()} data-testid="cmp-sign-out">
        <Icon name="out" />{signingOut ? "Signing out..." : "Sign out"}
      </button>
      <CmpMoreFooter onDeleteAccount={p.onDeleteAccount} />
    </section>
  );
}
