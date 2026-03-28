import { createApplication, submitApplication, uploadDocuments } from "../../api/applications";
import type { ApplicationState } from "../../state/application";
import React, { useState } from "react";

export default function ReviewSubmit({ state }: { state: ApplicationState }) {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;

    setSubmitting(true);

    if (!state.selectedProduct) {
      setSubmitting(false);
      throw new Error("Missing product");
    }

    try {
      const created = await createApplication({
        business_name: "Test Co",
        requested_amount: 100000,
        lender_id: state.selectedProduct.lender_id,
        product_id: state.selectedProduct.id,
      });

      const createdPayload = (created ?? {}) as { id?: string; applicationId?: string; token?: string };
      const applicationId = createdPayload.id ?? createdPayload.applicationId ?? createdPayload.token;

      if (!applicationId) {
        throw new Error("Missing application ID");
      }

      await uploadDocuments(applicationId, []);
      await submitApplication(applicationId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button onClick={onSubmit} disabled={submitting}>
      {submitting ? "Submitting..." : "Submit"}
    </button>
  );
}
