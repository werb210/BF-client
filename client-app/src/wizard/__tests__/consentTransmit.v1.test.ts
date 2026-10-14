// BF_CLIENT_CONSENT_TRANSMIT_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const submission = readFileSync(path.join(here, "../submission.ts"), "utf8");
const step6 = readFileSync(path.join(here, "../Step6_Review.tsx"), "utf8");

describe("all three Step 6 consents reach the server", () => {
  it("the wizard still gates on three clauses", () => {
    expect(step6).toContain("Electronic Communications Risk Acknowledgement");
    expect(step6).toContain("Consent to Collect, Use, Verify, and Share Information");
    expect(step6).toContain("Communication Consent (Email, SMS, Phone, Portal, and Client Messaging)");
  });

  // BF_CLIENT_v808_MARKETING_OPTIN - clause 3 covers texts about the application; consent to marketing texts
  // is the separate optional "Text me offers" box.
  it("clause 3 covers application texts; marketing texts need the separate offers box", () => {
    expect(step6).toContain("I/We authorize Boreal Financial and its staff to communicate");
    expect(step6).toContain("separate, optional");
    expect(step6).not.toContain("marketing opportunities"); // BF_CLIENT_SMS_DISCLOSURE_v690
    expect(step6).toContain("SMS/Text Messages");
  });

  it("transmits share_authorization and communication_consent, not just terms_accepted", () => {
    // Only terms_accepted was ever sent. infoConfirmed -- the SMS marketing consent --
    // gated the Submit button and was then discarded, so the sender never saw it.
    expect(submission).toContain("share_authorization: app.shareAuthorization");
    expect(submission).toContain("communication_consent: app.infoConfirmed");
  });

  it("records the clause-to-gate-key mapping, which is positional and non-obvious", () => {
    expect(submission).toContain("infoConfirmed");
    expect(submission).toContain("BF_CLIENT_CONSENT_TRANSMIT_v1");
  });
});
