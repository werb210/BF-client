import { createApplication, submitApplication, uploadDocuments } from "../../api/applications";
import type { ApplicationState } from "../../state/application";
import React, { useState } from "react";
import { runSubmissionFlow } from "./submissionFlow";

export default function ReviewSubmit({ state }: { state: ApplicationState }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    if (!state.selectedProduct) {
      setError("Missing product");
      setSubmitting(false);
      return;
    }

    try {
      let applicationId = "";

      await runSubmissionFlow(
        async () => {
          const created = await createApplication({
            business_name: "Test Co",
            requested_amount: 100000,
            lender_id: state.selectedProduct.lender_id,
            product_id: state.selectedProduct.id,
          });

          const createdPayload = (created ?? {}) as { id?: string; applicationId?: string; token?: string };
          applicationId = createdPayload.id ?? createdPayload.applicationId ?? createdPayload.token ?? "";

          if (!applicationId) {
            throw new Error("Missing applicationId");
          }
        },
        async () => {
          if (!applicationId) {
            throw new Error("Missing applicationId");
          }

          await uploadDocuments(applicationId, []);
        },
        async () => {
          if (!applicationId) {
            throw new Error("Missing applicationId");
          }

          await submitApplication(applicationId);
        }
      );
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button onClick={onSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
