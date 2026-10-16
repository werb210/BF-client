// BF_CLIENT_v802_PHONE_UI - the phone More tab (item 20): grouped rows, each with an icon, a short
// description and whether it is needed or done. Plus the branded call button (item 21).
import { Icon } from "./icons";
import "./cmp.css";

export type CallState = "idle" | "connecting" | "ringing" | "connected" | "ended" | "failed";

export const FORM_INFO: Record<string, { icon: string; desc: string }> = {
  networth: { icon: "scale", desc: "Your personal assets and debts, completed by you." }, // BF_CLIENT_v817 - the form itself has no signature field
  debt: { icon: "doc", desc: "Loans and leases your business pays today." },
  advisors: { icon: "people", desc: "Your accountant, lawyer and other advisors." },
  cra: { icon: "shield", desc: "Lets lenders confirm your tax filings with the CRA." },
  flinks: { icon: "bank", desc: "A view-only bank connection that shares your statements." },
  equipment: { icon: "truck", desc: "Equipment offered as security for the loan." },
  realestate: { icon: "home", desc: "Property offered as security for the loan." },
  sba_forms: { icon: "flag", desc: "SBA Form 1919, and Form 413 for each owner." },
};

export type MoreForm = { id: string; label: string; status: "needed" | "done" | "optional" };

const PILL: Record<MoreForm["status"], string> = { needed: "Needed", done: "Done", optional: "Optional" };

/** Item 21 - navy, a drawn phone icon; no emoji and no green. Hang up stays red. */
export function CallControl({ state, error, onStart, onEnd, onReset, label = "Call Boreal" }: { state: CallState; error: string | null; onStart: () => void; onEnd: () => void; onReset: () => void; label?: string }) {
  if (state === "connecting" || state === "ringing") {
    return (
      <div className="cmpx-callstate" role="status">
        <span>{state === "connecting" ? "Connecting..." : "Ringing your advisor..."}</span>
        <button type="button" className="cmpx-link" onClick={onEnd}>Cancel</button>
      </div>
    );
  }
  if (state === "connected") {
    return <button type="button" className="cmpx-call cmpx-call--end" onClick={onEnd}><Icon name="phone" />Hang up</button>;
  }
  if (state === "failed") {
    return (
      <div className="cmpx-callstate" role="alert" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#7F1D1D" }}>
        <span>{error ?? "The call didn't connect."}</span>
        <button type="button" className="cmpx-link" style={{ color: "#7F1D1D" }} onClick={onReset}>Try again</button>
      </div>
    );
  }
  return <button type="button" className="cmpx-call" data-testid="cmp-call" onClick={state === "ended" ? () => { onReset(); onStart(); } : onStart}><Icon name="phone" />{label}</button>;
}

function Row({ icon, title, desc, right, onClick, testId }: { icon: string; title: string; desc?: string; right?: React.ReactNode; onClick?: () => void; testId?: string }) {
  return (
    <button type="button" className="cmpx-row" onClick={onClick} data-testid={testId}>
      <span className="cmpx-row__icon"><Icon name={icon} /></span>
      <span className="cmpx-row__text">
        <span className="cmpx-row__title">{title}</span>
        {desc ? <span className="cmpx-row__desc">{desc}</span> : null}
      </span>
      {right}
      <span className="cmpx-chev"><Icon name="chevron" size={18} /></span>
    </button>
  );
}

export default function CmpMore(p: {
  forms: MoreForm[];
  docsStatus: "needed" | "done" | null;
  onForm: (id: string) => void;
  onUpload: () => void;
  onNewApplication: () => void;
}) {
  return (
    <section className="cmp-phone-only" data-cmp-tab="more" data-testid="cmp-more">
      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Documents</h2>
        <div className="cmpx-list">
          <Row icon="upload" title="Upload documents" desc="Scan with your camera or choose a file." onClick={p.onUpload} testId="cmp-more-upload"
            right={p.docsStatus ? <span className={"cmpx-pill cmpx-pill--" + p.docsStatus}>{p.docsStatus === "needed" ? "Needed" : "Up to date"}</span> : null} />
        </div>
      </div>
      {p.forms.length > 0 ? (
        <div className="cmpx-group">
          <h2 className="cmpx-group__title">Forms</h2>
          <div className="cmpx-list">
            {p.forms.map((f) => (
              <Row key={f.id} icon={FORM_INFO[f.id]?.icon ?? "doc"} title={f.label} desc={FORM_INFO[f.id]?.desc} onClick={() => p.onForm(f.id)} testId={"cmp-more-form-" + f.id}
                right={<span className={"cmpx-pill cmpx-pill--" + f.status}>{PILL[f.status]}</span>} />
            ))}
          </div>
        </div>
      ) : null}
      {/* BF_CLIENT_v807_MORE - Call, Book a call and Ask Maya are on Home (advisor card) and in Chat; not repeated here. */}
      <div className="cmpx-group">
        <h2 className="cmpx-group__title">Applications</h2>
        <div className="cmpx-list">
          <Row icon="plus" title="Start a new application" desc="Apply for more funding or another product." onClick={p.onNewApplication} testId="cmp-more-new" />
        </div>
      </div>
    </section>
  );
}
