import { useState } from "react";
import { submitCreditReadiness, type CreditReadinessPayload } from "@/api/website";
import { trackEvent } from "../utils/analytics";

export default function CapitalScorePreview() {
  const [formState] = useState<CreditReadinessPayload>({
    companyName: "",
    fullName: "",
    phone: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleSubmit() {
    if (submitting) return;

    trackEvent("capital_score_requested");
    setSubmitting(true);
    setMessage("");

    try {
      await submitCreditReadiness(formState);
      setMessage("A Boreal Intake Specialist will contact you shortly.");
      window.location.href = "/";
    } catch (error) {
      setMessage("Submission failed. Please try again.");
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button onClick={() => void handleSubmit()} disabled={submitting}>
        {submitting ? "Submitting..." : "Preview Your Capital Readiness"}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
