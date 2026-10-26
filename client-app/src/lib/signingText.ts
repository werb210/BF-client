// BF_CLIENT_v858_PARTNER_SIGNING
// The client portal's signing words for whoever is signed in. GET /api/client/signing-session now answers for the
// signed-in owner only (BF-Server v858): Owner 1 (the applicant) as before, and a partner / second owner with their
// own link, or with who they are waiting for, or that they have already signed. A person on the file who is not a
// signer is refused (403), and the portal says so instead of "try again shortly".

export type SignSigner = { index: number; role: string; name: string | null; isApplicant: boolean };
export type SignSession = {
  status: string;
  url?: string;
  reason?: string;
  waitingFor?: string;
  ownerLink?: string;
  signer?: SignSigner;
};
export type SignTodo = { key: string; kind: "action"; label: string; urgent: boolean; action: string };

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Reads the server's answer (unknown fields are dropped; an older server simply has no signer). */
export function toSignSession(r: any): SignSession {
  const s = r?.signer && typeof r.signer === "object" ? r.signer : null;
  return {
    status: String(r?.status ?? "error"),
    url: str(r?.url),
    reason: str(r?.reason),
    waitingFor: str(r?.waitingFor),
    ownerLink: str(r?.ownerLink),
    signer: s
      ? { index: Number(s.index) || 1, role: String(s.role ?? ""), name: str(s.name) ?? null, isApplicant: s.isApplicant !== false && Number(s.index) <= 1 }
      : undefined,
  };
}

/** The signed-in person is a partner / second owner (not the applicant). */
export function isPartnerSigner(s: SignSession | null | undefined): boolean {
  return !!s?.signer && s.signer.isApplicant === false;
}

/** The "What you need to do" item: only when it is this person's turn to sign. */
export function signingTodo(s: SignSession | null | undefined): SignTodo[] {
  if (s?.status !== "ready") return [];
  const label = isPartnerSigner(s) ? "Sign the application documents as " + (s!.signer!.role || "an owner") : "Sign your application documents";
  return [{ key: "sign", kind: "action", label, urgent: false, action: "sign" }];
}

/** A one-line notice for the portal while this person cannot sign yet (null when there is nothing to say). */
export function signingNotice(s: SignSession | null | undefined): string | null {
  if (!s) return null;
  if (s.status === "not_ready" && s.reason === "waiting_for_signer") return "Waiting for " + (s.waitingFor || "the other owner") + " to sign first. We will let you know when it is your turn.";
  if (!isPartnerSigner(s)) return null;
  if (s.status === "signed") return "You have signed your documents. Thank you!";
  if (s.status === "not_ready" && s.reason === "documents_not_ready") return "Your documents are not ready to sign yet. " + (s.waitingFor ? s.waitingFor + " signs first, then it is your turn." : "We will let you know when they are.");
  return null;
}

/** The text inside the signing window for every state but "ready" (which shows the documents). */
export function signingModalText(s: SignSession | null | undefined): string | null {
  if (!s) return null;
  if (s.status === "ready") return null;
  if (s.status === "refused") return "You are not listed as a signer on this application. If you should be, please call us at (866) 631-8939.";
  if (s.status === "signed") return isPartnerSigner(s) ? "You have signed your documents. Thank you!" : "\u2713 Your documents are signed. Thank you!";
  if (s.status === "stub") return "Signing isn\u2019t enabled in this environment yet.";
  if (s.status === "error") return "We couldn\u2019t load your signing session. Please try again shortly.";
  if (s.status === "not_ready") {
    switch (s.reason) {
      case "pnw_not_signed": return "Please sign your Personal Net worth Statement";
      case "waiting_for_signer": return "Waiting for " + (s.waitingFor || "the other owner") + " to sign first. We will let you know when it is your turn.";
      case "signs_by_email": return "SignNow emails your documents to you directly. Please use the link in that email to sign.";
      case "signer_details_changed": return "Your details changed after the documents were prepared. We will send you fresh documents to sign.";
      case "no_signer_email": return "We need your email address before you can sign. Please call us at (866) 631-8939.";
      case "documents_not_ready":
        return "Your documents aren\u2019t ready to sign yet" + (s.waitingFor ? " \u2014 " + s.waitingFor + " signs first, then it is your turn." : " \u2014 we\u2019ll text you the moment they are.");
      default: return "Your documents aren\u2019t ready to sign yet \u2014 we\u2019ll text you the moment they are.";
    }
  }
  return null;
}
