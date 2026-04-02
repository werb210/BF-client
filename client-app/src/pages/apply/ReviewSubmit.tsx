import React, { useState } from "react";
import type { ApplicationState } from "../../state/application";
import { runSubmissionFlow } from "../submissionFlow";

export default function ReviewSubmit({ state }: { state: ApplicationState }) {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;

    if (!state.selectedProduct) {
      throw new Error("Missing product");
    }

    setSubmitting(true);

    try {
      await runSubmissionFlow();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button onClick={onSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
