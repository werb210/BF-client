// BF_CLIENT_FLINKS_EMBED_DEMO_v1
// Public, static lender-facing sales asset: no authentication or API data path.
import { useCallback, useEffect, useRef, useState } from "react";
import "./MiniPortalPage.css";
import "./FlinksDemoPage.css";

const LENDER = { name: "Accord Financial", mark: "AF", colour: "#0F5C3F", host: "accordfinancial.flinksapp.io" };
const APPLICANT = [["Name", "Dana Whitfield"], ["Email", "dana@creekviewfarms.ca"], ["Phone number", "(403) 555-0142"], ["Business legal name", "Creek View Farms Ltd."]];
const BANKS = [["RBC", "#0051A5"], ["TD", "#0E7C3A"], ["Scotiabank", "#B8102E"], ["BMO", "#0B4EA2"]];
const STAGES = ["Received", "In Review", "Documents Required", "Additional Steps Required", "Off to Lender", "Offer"];
type Phase = "intro" | "connect" | "done";

export default function FlinksDemoPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [screen, setScreen] = useState(0);
  const [prefill, setPrefill] = useState(false);
  const [notes, setNotes] = useState(false);
  const [completedAt, setCompletedAt] = useState("");
  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => { timers.current.forEach(window.clearTimeout); timers.current = []; }, []);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots"; tag.content = "noindex, nofollow"; document.head.appendChild(tag);
    const title = document.title; document.title = "Bank connect inside the Boreal client portal";
    return () => { tag.remove(); document.title = title; };
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  useEffect(() => {
    if (phase !== "connect") return;
    if (screen === 3) later(() => setScreen(4), 1500);
    if (screen === 5) later(() => { setCompletedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); setPhase("done"); }, 1700);
  }, [phase, screen, later]);

  const reset = () => { clearTimers(); setScreen(0); setPhase("intro"); setCompletedAt(""); };
  const done = phase === "done";
  const step = screen === 0 ? "Step 1 of 4" : screen === 1 ? "Step 2 of 4" : screen === 2 ? "Step 3 of 4" : screen === 5 ? "Complete" : "Step 4 of 4";

  return <div className="mp-root" style={{ ["--fd-lender" as string]: LENDER.colour }}>
    <header><span className="fd-ribbon">Demonstration</span><h1>Bank connect, inside the Boreal client portal</h1><p className="fd-lead">What your applicants would see if your Flinks Connect instance were embedded in our client mini-portal. Click through it — the whole round trip is here. The portal around the frame is the real thing.</p></header>
    <div className="fd-controls"><label htmlFor="fd-prefill">Prefill from application</label><select id="fd-prefill" value={prefill ? "on" : "off"} onChange={e => setPrefill(e.target.value === "on")}><option value="off">Off — applicant retypes</option><option value="on">On — passed with the tag</option></select><button type="button" aria-pressed={notes} onClick={() => setNotes(n => !n)}>{notes ? "Hide technical notes" : "Show technical notes"}</button></div>
    <div className="mp-app-header"><div className="mp-app-header__left">Application <span className="mp-app-header__id">B4F595EA</span></div><div className="mp-app-header__right">Stage <span className="mp-app-header__stage-value">{done ? "Additional Steps Required" : "Documents Required"}</span></div></div>
    <div className="mp-tracker">{STAGES.map((label, i) => <div key={label} className={`mp-stage${i < 2 ? " mp-stage--done" : i === 2 ? " mp-stage--current" : ""}`}><div className="mp-stage__bullet">{i < 2 ? "✓" : ""}</div><div className="mp-stage__label">{label}</div></div>)}</div>
    <div className="mp-grid"><div>
      {phase === "intro" && <div className="mp-actions"><div className="mp-actions__header">Connect your bank — view only</div><div className="fd-pad"><p>{LENDER.name} reviews your recent banking activity as part of your application. The connection is read-only and takes about a minute.</p><button type="button" className="fd-lenderbtn" onClick={() => setPhase("connect")}>Connect bank account</button>{notes && <p className="fd-note"><b>Today this opens a new tab.</b> The live portal calls <code>window.open("https://accordfinancial.flinksapp.io")</code> and then asks the applicant to tick a box saying they connected. Nothing verifies that they did. Below is the embedded replacement.</p>}</div></div>}
      {phase === "connect" && <div><div className="fd-embedbar"><span className="fd-dot"/><span>Embedded</span><span className="fd-url">https://{LENDER.host}/?tag=B4F595EA</span></div><div className={`fd-frame${prefill ? " fd-prefilled" : ""}`}><div className="fd-fxhead"><div className="fd-mark">{LENDER.mark}</div><div className="fd-fxname">{LENDER.name}</div><div className="fd-fxstep">{step}</div></div><div className="fd-fxbody">
        {screen === 0 && <><h3>Let&rsquo;s get started.</h3><p>This tool will help you quickly and safely confirm your identity and validate your banking activity for {LENDER.name}.</p><button className="fd-lenderbtn" onClick={() => setScreen(1)}>Get started</button></>}
        {screen === 1 && <><h3>Your details</h3>{APPLICANT.map(([label, value]) => <div className="fd-fld" key={label}><label htmlFor={`fd-${label}`}>{label}</label><input id={`fd-${label}`} value={value} readOnly/>{prefill && <div className="fd-pre">Prefilled from your Boreal application</div>}</div>)}<button className="fd-lenderbtn" onClick={() => setScreen(2)}>Link bank account</button></>}
        {screen === 2 && <><h3>Choose your bank</h3><p>Sign in with your online banking credentials. {LENDER.name} receives read-only access.</p><div className="fd-banks">{BANKS.map(([bank, colour]) => <button className="fd-bank" key={bank} onClick={() => setScreen(3)}><span className="fd-sq" style={{background: colour}}/>{bank}</button>)}</div></>}
        {screen === 3 && <div className="fd-centred"><div className="fd-spinner" role="status" aria-label="Connecting"/><p>Connecting securely…</p></div>}
        {screen === 4 && <><h3>Accounts connected</h3>{[["Business Chequing", "•••• 4417"], ["Business Savings", "•••• 8830"]].map(([name, digits]) => <div className="fd-acct" key={name}><div><div className="fd-an">{name}</div><div className="fd-ad">{digits}</div></div><span className="fd-ck">✓</span></div>)}<button className="fd-lenderbtn" onClick={() => setScreen(5)}>Continue</button></>}
        {screen === 5 && <div className="fd-centred"><div className="fd-okmark">✓</div><h3>Your bank account was connected successfully!</h3><p>Thank you for doing business with {LENDER.name}.</p><p>Returning you to your application…</p></div>}
      </div><div className="fd-fxfoot"><span><b>Read-only.</b> No one can move money using this service.</span><span><b>256-bit encryption.</b></span><span className="fd-powered">Powered by Flinks</span></div></div>{notes && <p className="fd-note"><b>This frame is your instance, unchanged.</b> Boreal renders it in an iframe and listens for the terminal success event on <code>window.postMessage</code>, validating the sender origin against your Flinks domain. We never see the credentials or account data.</p>}</div>}
      {phase === "done" && <div className="fd-capture"><h5>What Boreal received</h5>{[["Completion", `confirmed ${completedAt}`], ["loginId", "f4c1a9e2-77b0-4d3a-9e18-2b6d0c5a71fe"], ["Correlation tag", "B4F595EA"], ["Account balances", "not received"], ["Transactions", "not received"], ["Statements", "not received"]].map(([key, value]) => <div className="fd-kv" key={key}><span className="fd-k">{key}</span><span className={`fd-v${value === "not received" ? " fd-no" : ""}`}>{value}</span></div>)}<div className="fd-pad"><button className="mp-btn mp-btn--secondary fd-wide" onClick={reset}>Replay the walkthrough</button></div></div>}
    </div><aside className="fd-side"><div className="mp-actions"><div className="mp-actions__header">Your remaining steps</div><div className="mp-actions__chips"><button className="mp-chip--action" disabled>{done ? "✓ Bank connected" : "Connect bank"}</button><button className="mp-chip--action" disabled>CRA authorization</button><button className="mp-chip--action" disabled>Personal net worth</button><button className="mp-chip--action" disabled>✓ Photo ID</button></div></div><div className="mp-thread-card"><div className="mp-thread-card__header">Messages</div><div className="mp-thread-card__body"><div className="mp-msg-row"><div className="mp-msg-avatar">B</div><div className="mp-msg-stack"><div className="mp-msg-bubble mp-msg-bubble--in">Thanks for applying. Three steps left and your file goes to {LENDER.name}.</div></div></div>{done && <div className="mp-msg-row"><div className="mp-msg-avatar">B</div><div className="mp-msg-stack"><div className="mp-msg-bubble mp-msg-bubble--in">Bank connected — thanks. Two steps left: CRA authorization and personal net worth.</div></div></div>}</div></div></aside></div>
    <div className="fd-legend"><h3>What we would need from you</h3><ol><li>Your Flinks Connect instance URL — the customer subdomain you already use.</li><li>Permission for <b>https://client.boreal.financial</b> to frame that instance and receive its completion event.</li><li>Acceptance of a correlation tag, optionally with applicant details as prefill.</li><li>A webhook to <b>https://server.boreal.financial/api/webhooks/flinks/[lender]</b> carrying the loginId and tag, secured by a shared secret.</li></ol><p className="fd-foot"><b>Boreal absorbs no Flinks cost</b> — this uses the instance you already pay for. And <b>Boreal never receives the banking data</b>: account information stays inside your Flinks environment. We store only completion status, loginId and tag.</p><p className="fd-foot">If your Flinks configuration will not permit third-party framing, the same flow works in a new tab with the tag and webhook. You keep the real completion signal; it simply is not embedded.</p></div>
  </div>;
}
