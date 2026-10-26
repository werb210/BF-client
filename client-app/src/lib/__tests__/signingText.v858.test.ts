// BF_CLIENT_v858_PARTNER_SIGNING - the client portal's signing words for the applicant and for a partner.
import { describe, expect, it } from "vitest";
import { isPartnerSigner, signingModalText, signingNotice, signingTodo, toSignSession } from "../signingText";

const SEAN = { index: 1, role: "Owner 1", name: "Sean Dwyer", isApplicant: true };
const ELIZ = { index: 2, role: "Owner 2", name: "Elizabeth Cullen", isApplicant: false };

describe("v858 signing text", () => {
  it("reads the server answer, with or without a signer (older server)", () => {
    expect(toSignSession({ status: "ready", url: "https://s.test/1" })).toEqual({ status: "ready", url: "https://s.test/1", reason: undefined, waitingFor: undefined, ownerLink: undefined, signer: undefined });
    const s = toSignSession({ status: "ready", url: "https://s.test/2", ownerLink: "https://server.test/api/signing/owner/x", signer: ELIZ });
    expect(s.signer).toEqual(ELIZ);
    expect(s.ownerLink).toBe("https://server.test/api/signing/owner/x");
    expect(isPartnerSigner(s)).toBe(true);
    expect(isPartnerSigner(toSignSession({ status: "ready", signer: SEAN }))).toBe(false);
    expect(toSignSession(null).status).toBe("error");
  });

  it("the to-do: the applicant's words unchanged, a partner's names their owner slot, nothing while waiting", () => {
    expect(signingTodo({ status: "ready", signer: SEAN })).toEqual([{ key: "sign", kind: "action", label: "Sign your application documents", urgent: false, action: "sign" }]);
    expect(signingTodo({ status: "ready" })[0]!.label).toBe("Sign your application documents");
    expect(signingTodo({ status: "ready", signer: ELIZ })[0]!.label).toBe("Sign the application documents as Owner 2");
    expect(signingTodo({ status: "not_ready", reason: "waiting_for_signer", waitingFor: "Sean Dwyer", signer: ELIZ })).toEqual([]);
    expect(signingTodo({ status: "signed", signer: ELIZ })).toEqual([]);
    expect(signingTodo(null)).toEqual([]);
  });

  it("waiting for an earlier owner says who", () => {
    const w = { status: "not_ready", reason: "waiting_for_signer", waitingFor: "Sean Dwyer", signer: ELIZ };
    expect(signingNotice(w)).toBe("Waiting for Sean Dwyer to sign first. We will let you know when it is your turn.");
    expect(signingModalText(w)).toBe("Waiting for Sean Dwyer to sign first. We will let you know when it is your turn.");
  });

  it("an owner who has signed is told so", () => {
    expect(signingNotice({ status: "signed", signer: ELIZ })).toBe("You have signed your documents. Thank you!");
    expect(signingModalText({ status: "signed", signer: ELIZ })).toBe("You have signed your documents. Thank you!");
    expect(signingModalText({ status: "signed", signer: SEAN })).toBe("\u2713 Your documents are signed. Thank you!");
    expect(signingNotice({ status: "signed", signer: SEAN })).toBeNull();
  });

  it("someone who is not a signer is told so, not 'try again'", () => {
    expect(signingModalText({ status: "refused" })).toMatch(/^You are not listed as a signer on this application\./);
  });

  it("the other states keep their words", () => {
    expect(signingModalText({ status: "ready" })).toBeNull();
    expect(signingModalText({ status: "not_ready", reason: "pnw_not_signed" })).toBe("Please sign your Personal Net worth Statement");
    expect(signingModalText({ status: "not_ready", reason: "lender_not_finalized" })).toBe("Your documents aren\u2019t ready to sign yet \u2014 we\u2019ll text you the moment they are.");
    expect(signingModalText({ status: "not_ready", reason: "documents_not_ready", waitingFor: "Sean Dwyer", signer: ELIZ })).toBe("Your documents aren\u2019t ready to sign yet \u2014 Sean Dwyer signs first, then it is your turn.");
    expect(signingNotice({ status: "not_ready", reason: "documents_not_ready", waitingFor: "Sean Dwyer", signer: ELIZ })).toBe("Your documents are not ready to sign yet. Sean Dwyer signs first, then it is your turn.");
    expect(signingModalText({ status: "not_ready", reason: "signs_by_email", signer: ELIZ })).toMatch(/SignNow emails your documents/);
    expect(signingModalText({ status: "not_ready", reason: "signer_details_changed", signer: ELIZ })).toMatch(/fresh documents/);
  });
});
