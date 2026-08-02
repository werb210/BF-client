// BF_CLIENT_STEP5_ACCOUNTANT_v1 - collects the accounting firm before Step 5
// defers the documents. Every field is required because the accountant later
// signs in by phone and must be reachable to upload the requested documents.
import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { tokens } from "@/styles/tokens";

export type AccountantDetails = {
  firm: string;
  contact: string;
  email: string;
  phone: string;
};

const EMPTY: AccountantDetails = { firm: "", contact: "", email: "", phone: "" };

export function AccountantReferralModal({
  open,
  busy,
  onCancel,
  onSubmit,
  // BF_CLIENT_ACCOUNTANT_SURFACE_FAILURE_v1 - a failed capture used to be
  // swallowed by a console.warn and the wizard advanced anyway, so the
  // applicant believed their accountant had been contacted when nothing was
  // sent. The caller now reports the failure here.
  submitError = null,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (details: AccountantDetails) => void;
  submitError?: string | null;
}) {
  const [details, setDetails] = useState<AccountantDetails>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const set = (key: keyof AccountantDetails) => (event: ChangeEvent<HTMLInputElement>) =>
    setDetails((previous) => ({ ...previous, [key]: event.target.value }));

  function handleSubmit() {
    const trimmed: AccountantDetails = {
      firm: details.firm.trim(),
      contact: details.contact.trim(),
      email: details.email.trim(),
      phone: details.phone.trim(),
    };
    if (!trimmed.firm || !trimmed.contact || !trimmed.email || !trimmed.phone) {
      setError("Please fill in all four fields so we can reach your accountant.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accountant-referral-title"
      data-testid="accountant-referral-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: tokens.spacing.md,
        background: "rgba(8, 19, 42, 0.6)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "90dvh",
          overflowY: "auto",
          borderRadius: 14,
          padding: tokens.spacing.lg,
          background: tokens.colors.surface,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div id="accountant-referral-title" style={{ fontWeight: 700, fontSize: 18, marginBottom: tokens.spacing.sm }}>
          Who is your accountant?
        </div>
        <div style={{ fontSize: 13, color: tokens.colors.textSecondary, marginBottom: tokens.spacing.md }}>
          We will email them a request to upload your financial documents. You can
          carry on and finish your application now.
        </div>

        <label style={{ display: "block", marginBottom: tokens.spacing.sm }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Accounting firm</div>
          <Input autoComplete="organization" value={details.firm} onChange={set("firm")} disabled={busy} />
        </label>
        <label style={{ display: "block", marginBottom: tokens.spacing.sm }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Accountant name</div>
          <Input autoComplete="name" value={details.contact} onChange={set("contact")} disabled={busy} />
        </label>
        <label style={{ display: "block", marginBottom: tokens.spacing.sm }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Email</div>
          <Input type="email" autoComplete="email" value={details.email} onChange={set("email")} disabled={busy} />
        </label>
        <label style={{ display: "block", marginBottom: tokens.spacing.md }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Phone</div>
          <Input type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={set("phone")} disabled={busy} />
        </label>

        {(submitError ?? error) && (
          <div role="alert" style={{ color: tokens.colors.error, fontSize: 13, marginBottom: tokens.spacing.sm }}>
            {submitError ?? error}
          </div>
        )}

        <div style={{ display: "flex", gap: tokens.spacing.sm, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Saving…" : "Send to my accountant"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AccountantReferralModal;
